import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getProviderForMode, AiMode } from "../ai/client";

export const aiRouter = Router();

aiRouter.post("/ask", requireAuth, async (req: AuthedRequest, res) => {
  const { code, question, language, mode = "fast" } = req.body as {
    code: string;
    question: string;
    language: string;
    mode: AiMode;
  };

  if (typeof code !== "string" || !question) {
    return res.status(400).json({ error: "code and question required" });
  }

  const { client, model, reasoning } = getProviderForMode(mode);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let stream;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        stream = await client.chat.completions.create({
          model,
          stream: true,
          messages: [
            {
              role: "system",
              content: `You are a concise coding assistant scoped to the current file. Answer only about the ${language} code provided. Be direct, no filler.`,
            },
            {
              role: "user",
              content: `Current file:\n\`\`\`${language}\n${code}\n\`\`\`\n\nQuestion: ${question}`,
            },
          ],
          ...(reasoning && {
            max_tokens: 4096,
            reasoning_budget: 4096,
            chat_template_kwargs: { enable_thinking: true },
          }),
        } as any);
        break;
      } catch (err: any) {
        attempts++;
        console.error(`AI API attempt ${attempts} failed:`, err.message);
        if (attempts >= maxAttempts) throw err;
        await new Promise(r => setTimeout(r, 1000)); // wait 1s before retrying
      }
    }

    for await (const chunk of stream as any) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.reasoning_content) {
        res.write(`data: ${JSON.stringify({ reasoning: delta.reasoning_content })}\n\n`);
      }
      if (delta?.content) {
        res.write(`data: ${JSON.stringify({ text: delta.content })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("AI Request Failed:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "AI request failed" })}\n\n`);
    res.end();
  }
});

aiRouter.post("/diagram", requireAuth, async (req: AuthedRequest, res) => {
  const { description, mode = "fast" } = req.body as { description: string; mode: AiMode };

  if (!description) return res.status(400).json({ error: "description required" });

  const { client, model } = getProviderForMode(mode);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You output ONLY valid JSON, no markdown fences, no preamble. Schema:
{
  "shapes": [
    { "id": "string (unique)", "type": "rectangle" | "ellipse", "x": number, "y": number, "w": number, "h": number, "label": "string", "color": "black"|"blue"|"green"|"red"|"orange"|"violet" }
  ],
  "connections": [
    { "from": "shape id", "to": "shape id", "label": "string (optional)" }
  ]
}
Lay shapes out in a readable, non-overlapping grid based on the described flow. Use x/y/w/h in the range 0-1200.`,
        },
        { role: "user", content: description },
      ],
    });

    const raw = completion.choices[0].message.content!;
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Diagram error:", err);
    res.status(502).json({ error: "Model returned invalid JSON" });
  }
});
