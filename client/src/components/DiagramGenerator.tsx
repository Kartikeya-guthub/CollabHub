"use client";
import { useState } from "react";
import { Editor, createShapeId } from "tldraw";

interface DiagramShape {
  id: string;
  type: "rectangle" | "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
}

interface DiagramConnection {
  from: string;
  to: string;
  label?: string;
}

export default function DiagramGenerator({ editor, token }: { editor: Editor | null; token: string }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!description.trim() || !editor) return;
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description, mode: "fast" }), // Always default to fast for diagramming
      });

      if (!res.ok) throw new Error("Diagram generation failed");
      const { shapes, connections } = await res.json() as {
        shapes: DiagramShape[];
        connections: DiagramConnection[];
      };

      const idMap = new Map<string, ReturnType<typeof createShapeId>>();
      shapes.forEach((s) => idMap.set(s.id, createShapeId()));

      // Import toRichText dynamically to avoid SSR issues if any
      const { toRichText } = require("tldraw");

      editor.createShapes(
        shapes.map((s) => ({
          id: idMap.get(s.id)!,
          type: "geo" as const,
          x: s.x,
          y: s.y,
          props: {
            geo: s.type,
            w: s.w,
            h: s.h,
            color: s.color as any,
            dash: "draw" as const,
            size: "m" as const,
            richText: toRichText(s.label),
          },
        }))
      );

      connections.forEach((c) => {
        const fromId = idMap.get(c.from);
        const toId = idMap.get(c.to);
        if (!fromId || !toId) return;

        const fromShape = editor.getShape(fromId);
        const toShape = editor.getShape(toId);
        if (!fromShape || !toShape) return;

        const startX = fromShape.x + (fromShape.props as any).w / 2;
        const startY = fromShape.y + (fromShape.props as any).h;
        const endX = toShape.x + (toShape.props as any).w / 2;
        const endY = toShape.y;

        // Create the arrow shape
        editor.createShape({
          id: createShapeId(),
          type: "arrow",
          x: 0,
          y: 0,
          props: {
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
          } as any,
        });

        // Create text label if present
        if (c.label) {
          editor.createShape({
            type: "text",
            x: (startX + endX) / 2,
            y: (startY + endY) / 2,
            props: {
              text: c.label,
            } as any,
          });
        }
      });

      setDescription("");
    } catch (err: any) {
      alert("Couldn't generate diagram — try rephrasing the description. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
      <p style={{ opacity: 0.8, fontSize: "0.9rem", margin: 0 }}>
        Describe a flow or diagram and the AI will draw it on the whiteboard for you.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          disabled={loading || !editor}
          placeholder="e.g., three boxes in a pipe"
          style={{ 
            width: "100%", 
            background: "rgba(0,0,0,0.2)",
            border: "1px solid var(--glass-border)",
            color: "var(--foreground)",
            padding: "12px",
            borderRadius: "8px",
            boxSizing: "border-box"
          }}
        />
        <button 
          onClick={generate} 
          disabled={loading || !editor || !description.trim()}
          className="btn-primary"
          style={{ width: "100%", padding: "12px", borderRadius: "8px", whiteSpace: "nowrap", boxSizing: "border-box" }}
        >
          {loading ? "Generating..." : "Generate Diagram"}
        </button>
      </div>
    </div>
  );
}
