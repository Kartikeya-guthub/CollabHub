"use client";
import { useState } from "react";
import { Play, Terminal, SquareTerminal, Loader2 } from "lucide-react";

interface ConsolePanelProps {
  roomId: string;
  getCode: () => string;
  language: string;
  token: string;
}

export default function ConsolePanel({ roomId, getCode, language, token }: ConsolePanelProps) {
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setStdout("Running...");
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
      
      setStdout(outputText || "(No output)");
    } catch (e: any) {
      setStdout(e.message);
    } finally {
      setIsRunning(false);
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
            disabled={isRunning}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              backgroundColor: isRunning ? "#4d4d4d" : "#4CAF50",
              color: "white", border: "none", padding: "4px 12px",
              borderRadius: "4px", cursor: isRunning ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "12px"
            }}
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            Run
          </button>
        </div>
        <textarea 
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
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
