"use client";
import { useState, useEffect } from "react";
import { Play, Terminal, SquareTerminal, Loader2 } from "lucide-react";
import * as Y from "yjs";

interface ConsolePanelProps {
  roomId: string;
  getCode: () => string;
  language: string;
  token: string;
  doc?: Y.Doc;
}

export default function ConsolePanel({ roomId, getCode, language, token, doc }: ConsolePanelProps) {
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [globalIsRunning, setGlobalIsRunning] = useState(false);

  useEffect(() => {
    if (!doc) return;
    
    const yStdin = doc.getText("console-input");
    const yStdout = doc.getText("console-output");
    const editorState = doc.getMap("editor-state");

    const updateStdin = () => setStdin(yStdin.toString());
    const updateStdout = () => setStdout(yStdout.toString());
    const updateLock = () => setGlobalIsRunning(!!editorState.get("isRunningCode"));

    yStdin.observe(updateStdin);
    yStdout.observe(updateStdout);
    editorState.observe(updateLock);

    // Initial sync
    updateStdin();
    updateStdout();
    updateLock();

    return () => {
      yStdin.unobserve(updateStdin);
      yStdout.unobserve(updateStdout);
      editorState.unobserve(updateLock);
    };
  }, [doc]);

  const handleStdinChange = (val: string) => {
    setStdin(val); // optimistic UI update
    if (doc) {
      const yStdin = doc.getText("console-input");
      doc.transact(() => {
        if (yStdin.length > 0) yStdin.delete(0, yStdin.length);
        yStdin.insert(0, val);
      });
    }
  };

  const updateSharedOutput = (val: string) => {
    setStdout(val);
    if (doc) {
      const yStdout = doc.getText("console-output");
      doc.transact(() => {
        if (yStdout.length > 0) yStdout.delete(0, yStdout.length);
        yStdout.insert(0, val);
      });
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    if (doc) doc.getMap("editor-state").set("isRunningCode", true);
    updateSharedOutput("Running...");
    try {
      // Create a single test case out of the custom stdin
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: getCode(),
          language,
          roomId,
          testCases: [{ input: stdin, expectedOutput: "" }]
        })
      });

      if (!res.ok) throw new Error("Execution failed");
      const data = await res.json();
      
      const result = data.results[0];
      let outputText = "";
      if (result.compileOutput) outputText += `Compile Output:\n${result.compileOutput}\n\n`;
      if (result.stderr) outputText += `Error:\n${result.stderr}\n\n`;
      outputText += `${result.actualOutput}`;
      
      updateSharedOutput(outputText || "(No output)");
    } catch (e: any) {
      updateSharedOutput(e.message);
    } finally {
      setIsRunning(false);
      if (doc) doc.getMap("editor-state").set("isRunningCode", false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#1e1e1e", color: "#d4d4d4", fontFamily: "monospace", fontSize: "13px" }}>
      {/* Top: Input */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderBottom: "1px solid #333" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #333", backgroundColor: "#252526" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <SquareTerminal size={14} />
            <span>Input (stdin)</span>
          </div>
          <button 
            onClick={handleRun}
            disabled={isRunning || globalIsRunning}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              backgroundColor: (isRunning || globalIsRunning) ? "#4d4d4d" : "#4CAF50",
              color: "white", border: "none", padding: "4px 12px",
              borderRadius: "4px", cursor: (isRunning || globalIsRunning) ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "12px"
            }}
          >
            {(isRunning || globalIsRunning) ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            {isRunning ? "Running..." : globalIsRunning ? "Running..." : "Run"}
          </button>
        </div>
        <textarea 
          value={stdin}
          onChange={(e) => handleStdinChange(e.target.value)}
          placeholder="Enter custom input here..."
          style={{ flex: 1, backgroundColor: "transparent", border: "none", color: "inherit", padding: "12px", resize: "none", outline: "none", fontFamily: "inherit" }}
        />
      </div>

      {/* Bottom: Output */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #333", backgroundColor: "#252526", display: "flex", alignItems: "center", gap: "6px" }}>
          <Terminal size={14} />
          <span>Output</span>
        </div>
        <div style={{ flex: 1, padding: "12px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
          {stdout}
        </div>
      </div>
    </div>
  );
}
