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

import { Wand2, X } from "lucide-react";

export default function DiagramGenerator({ editor, token }: { editor: any | null; token: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!description.trim() || !editor) return;
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // Upgraded to "deep" mode for better spatial reasoning
        body: JSON.stringify({ description, mode: "deep" }), 
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
          roundness: s.type === "rectangle" ? { type: 3 } : null,
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
            x: s.x + s.w / 2, 
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
            containerId: shapeId,
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
          roundness: { type: 2 },
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
            containerId: arrowId,
          });
        }
      });

      const currentElements = editor.getSceneElements();
      editor.updateScene({ elements: [...currentElements, ...newElements] });
      setDescription("");
      setIsOpen(false);
    } catch (err: any) {
      alert("Couldn't generate diagram — try rephrasing the description. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: "absolute",
          bottom: "104px", // Placed above the global copilot icon
          right: "24px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "#3b82f6", // Blue color to distinguish from the purple copilot
          color: "white",
          border: "none",
          boxShadow: "0 8px 32px rgba(59, 130, 246, 0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 1000,
          transition: "transform 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        title="Generate AI Diagram"
      >
        <Wand2 size={28} />
      </button>
    );
  }

  return (
    <div style={{ 
      position: "absolute", 
      top: 80, 
      right: 24, 
      width: 320, 
      zIndex: 1000, 
      backgroundColor: "rgba(30, 30, 30, 0.95)", 
      color: "white", 
      borderRadius: "12px", 
      border: "1px solid rgba(255,255,255,0.1)", 
      backdropFilter: "blur(10px)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
          <Wand2 size={16} color="#3b82f6" />
          AI Diagram
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ opacity: 0.8, fontSize: "0.9rem", margin: 0 }}>
          Describe a flow or diagram and the AI will draw it for you.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            disabled={loading || !editor}
            placeholder="e.g., three boxes in a pipe"
            style={{ 
              width: "100%", 
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--glass-border)",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              boxSizing: "border-box",
              outline: "none"
            }}
          />
          <button 
            onClick={generate} 
            disabled={loading || !editor || !description.trim()}
            style={{ 
              width: "100%", 
              padding: "12px", 
              borderRadius: "8px", 
              whiteSpace: "nowrap", 
              boxSizing: "border-box",
              background: "#3b82f6",
              color: "white",
              border: "none",
              cursor: (loading || !editor || !description.trim()) ? "not-allowed" : "pointer",
              opacity: (loading || !editor || !description.trim()) ? 0.5 : 1
            }}
          >
            {loading ? "Generating..." : "Generate Diagram"}
          </button>
        </div>
      </div>
    </div>
  );
}
