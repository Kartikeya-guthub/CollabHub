import OpenAI from "openai";

const groqClient = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "dummy", 
});

const nvidiaClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "dummy",
});

const geminiClient = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API_KEY || "dummy",
});

export type AiMode = "fast" | "deep";

export const getProviderForMode = (mode: AiMode) => {
  if (mode === "deep") {
    // For deep mode, we return an array of providers for fallback support
    return {
      providers: [
        { client: geminiClient, model: "gemini-2.5-flash", reasoning: false },
        { client: nvidiaClient, model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b", reasoning: true }
      ]
    };
  }
  return {
    providers: [
      { client: groqClient, model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", reasoning: false }
    ]
  };
};
