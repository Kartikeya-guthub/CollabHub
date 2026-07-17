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
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalIsGenerating, setGlobalIsGenerating] = useState(false);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const ytext = doc.getText("monaco");
    const editorState = doc.getMap("editor-state");

    // Listen for global generating lock
    const updateLock = () => {
      const locked = !!editorState.get("isGenerating");
      setGlobalIsGenerating(locked);
      editor.updateOptions({ readOnly: locked });
    };
    
    editorState.observe(updateLock);
    updateLock(); // initial state

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
    const editorState = doc.getMap("editor-state");
    editorState.set("isGenerating", true);
    
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

      // Clear the editor natively by temporarily unlocking it
      if (editorRef.current) {
        editorRef.current.updateOptions({ readOnly: false });
        const model = editorRef.current.getModel();
        editorRef.current.executeEdits("ai-clear", [{
          range: model.getFullModelRange(),
          text: ""
        }]);
        editorRef.current.updateOptions({ readOnly: true });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          if (!payload) continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text && editorRef.current) {
              let cleanText = parsed.text;
              if (cleanText.includes("```cpp")) cleanText = cleanText.replace("```cpp\n", "");
              if (cleanText.includes("```")) cleanText = cleanText.replace("```\n", "").replace("```", "");
              
              const model = editorRef.current.getModel();
              const lineCount = model.getLineCount();
              const lastLineLength = model.getLineMaxColumn(lineCount);
              
              editorRef.current.updateOptions({ readOnly: false });
              editorRef.current.executeEdits("ai-stream", [{
                range: { startLineNumber: lineCount, startColumn: lastLineLength, endLineNumber: lineCount, endColumn: lastLineLength },
                text: cleanText,
                forceMoveMarkers: true
              }]);
              editorRef.current.updateOptions({ readOnly: true });
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
      const editorState = doc.getMap("editor-state");
      editorState.set("isGenerating", false);
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
        disabled={isGenerating || globalIsGenerating}
        title="Auto-Generate Template from Signature"
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          background: (isGenerating || globalIsGenerating) ? "#4d4d4d" : "rgba(168, 85, 247, 0.9)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: (isGenerating || globalIsGenerating) ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          fontWeight: 500,
          fontSize: "13px",
          zIndex: 10,
          backdropFilter: "blur(4px)"
        }}
      >
        {(isGenerating || globalIsGenerating) ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {isGenerating ? "Generating..." : globalIsGenerating ? "Someone is generating..." : "Auto-Complete Template"}
      </button>
    </div>
  );
}
