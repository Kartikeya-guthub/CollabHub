"use client";
import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { Sparkles, Loader2 } from "lucide-react";

interface CodeEditorProps {
  doc: Y.Doc;
  awareness: Awareness;
}

export default function CodeEditor({ doc, awareness }: CodeEditorProps) {
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleMount: OnMount = (editor, monaco) => {
    const ytext = doc.getText("monaco");
    const model = editor.getModel();
    if (!model) return;

    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      awareness
    );
  };

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
    };
  }, []);

  const generateTemplate = async () => {
    if (isGenerating) return;
    
    const ytext = doc.getText("monaco");
    const currentCode = ytext.toString();
    const token = localStorage.getItem("token");
    
    setIsGenerating(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          code: currentCode, 
          question: "Generate the full boilerplate/template code for this. If it's a function, fill in the rest of the template including a main/driver function so it runs. IMPORTANT: The driver function MUST read input dynamically from standard input (e.g. cin or getline) instead of using hardcoded values. DO NOT print any interactive prompts like 'Enter input:'. Just read the input silently and output the result. RETURN ONLY RAW CODE, NO MARKDOWN, NO BACKTICKS, NO EXPLANATIONS. Start immediately with the code.", 
          language: "c++", 
          mode: "deep" 
        }),
      });

      if (!res.body) throw new Error("No response body");

      // Clear the editor first
      doc.transact(() => {
        ytext.delete(0, ytext.length);
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          if (!payload) continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              let cleanText = parsed.text;
              // Very naive strip of any markdown backticks if AI ignores instruction
              if (cleanText.includes("```cpp")) cleanText = cleanText.replace("```cpp\n", "");
              if (cleanText.includes("```")) cleanText = cleanText.replace("```\n", "").replace("```", "");
              
              doc.transact(() => {
                ytext.insert(ytext.length, cleanText);
              });
            }
          } catch (e) {
            console.error("Error parsing AI chunk:", e, payload);
          }
        }
      }
    } catch (err) {
      console.error("Template Gen Failed", err);
      alert("Failed to generate template");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Editor
        height="100%"
        defaultLanguage="cpp"
        onMount={handleMount}
        options={{ automaticLayout: true, minimap: { enabled: false } }}
        theme="vs-dark"
      />
      
      {/* Floating Auto-Generate Template Button */}
      <button
        onClick={generateTemplate}
        disabled={isGenerating}
        title="Auto-Generate Template from Signature"
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          background: isGenerating ? "#4d4d4d" : "rgba(168, 85, 247, 0.9)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: isGenerating ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          fontWeight: 500,
          fontSize: "13px",
          zIndex: 10,
          backdropFilter: "blur(4px)"
        }}
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {isGenerating ? "Generating..." : "Auto-Complete Template"}
      </button>
    </div>
  );
}
