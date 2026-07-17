"use client";
import { useState } from "react";

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

export default function DiagramGenerator({ editor, token }: { editor: any | null; token: string }) {
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

      const newElements: any[] = [];
      const idMap = new Map<string, string>();
      
      shapes.forEach((s) => {
        const shapeId = `shape-${Math.floor(Math.random() * 1000000000)}`;
        idMap.set(s.id, shapeId);
        
        const shapeEl: any = {
          type: s.type,
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000000),
          isDeleted: false,
          id: shapeId,
          fillStyle: "solid",
          strokeWidth: 2,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          angle: 0,
          x: s.x,
          y: s.y,
          strokeColor: s.color || "#000000",
          backgroundColor: "#ffffff",
          width: s.w,
          height: s.h,
          seed: Math.floor(Math.random() * 1000000000),
          groupIds: [],
          roundness: s.type === "rectangle" ? { type: 3 } : null, // slightly rounded rects
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false
        };
        newElements.push(shapeEl);

        if (s.label) {
          const textId = `${shapeId}-text`;
          shapeEl.boundElements = [{ id: textId, type: "text" }];
          
          newElements.push({
            type: "text",
            version: 1,
            versionNonce: Math.floor(Math.random() * 1000000000),
            isDeleted: false,
            id: textId,
            fillStyle: "hachure",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            angle: 0,
            x: s.x + s.w / 2, // Centered text (Excalidraw handles alignment)
            y: s.y + s.h / 2,
            strokeColor: "#000000",
            backgroundColor: "transparent",
            width: s.label.length * 10,
            height: 25,
            seed: Math.floor(Math.random() * 1000000000),
            groupIds: [],
            roundness: null,
            boundElements: [],
            updated: Date.now(),
            link: null,
            locked: false,
            fontSize: 20,
            fontFamily: 1,
            text: s.label,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: shapeId, // Bind to container shape
          });
        }
      });

      connections.forEach((c) => {
        const fromShape = shapes.find(sh => sh.id === c.from);
        const toShape = shapes.find(sh => sh.id === c.to);
        const mappedFrom = idMap.get(c.from);
        const mappedTo = idMap.get(c.to);
        
        if (!fromShape || !toShape || !mappedFrom || !mappedTo) return;

        const startX = fromShape.x + fromShape.w / 2;
        const startY = fromShape.y + fromShape.h / 2;
        const endX = toShape.x + toShape.w / 2;
        const endY = toShape.y + toShape.h / 2;
        const arrowId = `arrow-${Math.floor(Math.random() * 1000000000)}`;

        const arrowEl: any = {
          type: "arrow",
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000000),
          isDeleted: false,
          id: arrowId,
          fillStyle: "hachure",
          strokeWidth: 2,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          angle: 0,
          x: startX,
          y: startY,
          strokeColor: "#000000",
          backgroundColor: "transparent",
          width: Math.abs(endX - startX) || 1,
          height: Math.abs(endY - startY) || 1,
          seed: Math.floor(Math.random() * 1000000000),
          groupIds: [],
          roundness: { type: 2 }, // Curved arrows
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          startBinding: { elementId: mappedFrom, focus: 0, gap: 10 },
          endBinding: { elementId: mappedTo, focus: 0, gap: 10 },
          points: [
            [0, 0],
            [endX - startX, endY - startY]
          ],
          lastCommittedPoint: null,
          startArrowhead: null,
          endArrowhead: "arrow"
        };
        newElements.push(arrowEl);

        if (c.label) {
          const textId = `${arrowId}-text`;
          arrowEl.boundElements = [{ id: textId, type: "text" }];
          
          newElements.push({
            type: "text",
            version: 1,
            versionNonce: Math.floor(Math.random() * 1000000000),
            isDeleted: false,
            id: textId,
            fillStyle: "hachure",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            angle: 0,
            x: (startX + endX) / 2, 
            y: (startY + endY) / 2,
            strokeColor: "#000000",
            backgroundColor: "transparent",
            width: c.label.length * 10,
            height: 25,
            seed: Math.floor(Math.random() * 1000000000),
            groupIds: [],
            roundness: null,
            boundElements: [],
            updated: Date.now(),
            link: null,
            locked: false,
            fontSize: 16,
            fontFamily: 1,
            text: c.label,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: arrowId, // Bind to arrow
          });
        }
      });

      // Fetch existing elements so we don't overwrite them
      const currentElements = editor.getSceneElements();
      
      editor.updateScene({ 
        elements: [...currentElements, ...newElements] 
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
