"use client";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stderr: string | null;
  compileOutput: string | null;
  passed: boolean;
  statusDescription: string;
}

interface ExecutionPayload {
  results: TestResult[];
  passCount: number;
  totalCount: number;
  triggeredBy: string;
  timestamp: string;
}

interface RunTestsPanelProps {
  socket: Socket | null;
  roomId: string;
  getCode: () => string;
  language: string;
  testCases: TestCase[];
  token: string;
}

export default function RunTestsPanel({ socket, roomId, getCode, language, testCases, token }: RunTestsPanelProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionPayload | null>(null);

  useEffect(() => {
    if (!socket) return;
    
    const handler = (payload: ExecutionPayload) => {
      setResult(payload);
      setRunning(false);
    };
    socket.on("execution-result", handler);
    return () => { socket.off("execution-result", handler); };
  }, [socket]);

  const runTests = async () => {
    setRunning(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: getCode(), language, testCases, roomId }),
      });
      // result itself arrives via the "execution-result" socket event
    } catch (err) {
      console.error("Execution request failed:", err);
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", height: "100%" }}>
      <button 
        onClick={runTests} 
        disabled={running || !socket}
        className={running ? "btn-secondary" : "btn-primary"}
        style={{ width: "100%", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}
      >
        {running ? "Running Tests..." : "Run Tests (C++)"}
      </button>

      {result && (
        <div style={{ 
          background: "rgba(0,0,0,0.2)", 
          padding: "16px", 
          borderRadius: "8px", 
          flex: 1, 
          overflowY: "auto",
          border: "1px solid var(--glass-border)"
        }}>
          <h4 style={{ 
            margin: "0 0 12px 0", 
            color: result.passCount === result.totalCount ? "#4ade80" : "#f87171",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{result.passCount}/{result.totalCount} Passed</span>
            <span style={{ fontSize: "0.7rem", color: "var(--foreground)", opacity: 0.5 }}>By user: {result.triggeredBy.substring(0,6)}</span>
          </h4>
          
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {result.results.map((r, i) => (
              <li key={i} style={{ 
                padding: "12px", 
                borderRadius: "6px",
                background: "rgba(255,255,255,0.05)",
                borderLeft: `4px solid ${r.passed ? "#4ade80" : "#f87171"}`
              }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  Test {i + 1}: {r.passed ? "✓ Passed" : "✗ Failed"}
                </div>
                
                {!r.passed && (
                  <div style={{ fontSize: "0.85rem", opacity: 0.8, display: "flex", flexDirection: "column", gap: "4px", fontFamily: "monospace" }}>
                    <div><strong>Expected:</strong> {r.expectedOutput}</div>
                    <div><strong>Got:</strong> {r.actualOutput || '""'}</div>
                    {r.compileOutput && <div style={{ color: "#f87171" }}><strong>Compile error:</strong><pre style={{ margin: 0 }}>{r.compileOutput}</pre></div>}
                    {r.stderr && <div style={{ color: "#f87171" }}><strong>stderr:</strong><pre style={{ margin: 0 }}>{r.stderr}</pre></div>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
