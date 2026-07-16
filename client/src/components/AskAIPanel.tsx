"use client";
import { useState, useEffect, useRef } from "react";
import * as Y from "yjs";
import { MessageCircle, X, Maximize2, Minimize2, Sparkles, Send, Loader2 } from "lucide-react";

type AiMode = "fast" | "deep";

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
}

export default function AskAIPanel({ getCode, language, token, doc }: {
  getCode: () => string;
  language: string;
  token: string;
  doc: Y.Doc;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<AiMode>("fast");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  
  // Local state for rendering, synced from Yjs
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const yMessages = doc.getArray<AIMessage>("ai-messages");
    
    const updateMessages = () => {
      setMessages(yMessages.toArray());
    };
    
    yMessages.observe(updateMessages);
    updateMessages(); // Initial load
    
    return () => {
      yMessages.unobserve(updateMessages);
    };
  }, [doc]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const ask = async () => {
    if (!input.trim() || streaming) return;
    const question = input;
    setInput("");
    
    const yMessages = doc.getArray<AIMessage>("ai-messages");
    const msgId = Date.now().toString();
    
    // Push user message
    yMessages.push([{ id: `u-${msgId}`, role: "user", content: question }]);
    
    // Push empty assistant message to be filled
    const assistantMsgId = `a-${msgId}`;
    yMessages.push([{ id: assistantMsgId, role: "assistant", content: "", reasoning: "", isStreaming: true }]);
    
    setStreaming(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: getCode(), question, language, mode }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let reasoning = "";

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
            if (parsed.error) {
              text = `Error: ${parsed.error}`;
              continue;
            }
            if (parsed.reasoning) reasoning += parsed.reasoning;
            if (parsed.text) text += parsed.text;

            // Update the specific message in Y.Array
            doc.transact(() => {
              const arr = yMessages.toArray();
              const idx = arr.findIndex(m => m.id === assistantMsgId);
              if (idx !== -1) {
                const current = yMessages.get(idx);
                yMessages.delete(idx, 1);
                yMessages.insert(idx, [{ ...current, content: text, reasoning, isStreaming: true }]);
              }
            });
          } catch (e) {
            console.error("Error parsing AI chunk:", e, payload);
          }
        }
      }
      
      // Mark as done streaming
      doc.transact(() => {
        const arr = yMessages.toArray();
        const idx = arr.findIndex(m => m.id === assistantMsgId);
        if (idx !== -1) {
          const current = yMessages.get(idx);
          yMessages.delete(idx, 1);
          yMessages.insert(idx, [{ ...current, isStreaming: false }]);
        }
      });
      
    } catch (err) {
      console.error("AI Request Failed", err);
      doc.transact(() => {
        const arr = yMessages.toArray();
        const idx = arr.findIndex(m => m.id === assistantMsgId);
        if (idx !== -1) {
          yMessages.delete(idx, 1);
          yMessages.insert(idx, [{ id: assistantMsgId, role: "assistant", content: "Error connecting to AI.", isStreaming: false }]);
        }
      });
    } finally {
      setStreaming(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "#a855f7",
          color: "white",
          border: "none",
          boxShadow: "0 8px 32px rgba(168, 85, 247, 0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 1000,
          transition: "transform 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        <Sparkles size={28} />
      </button>
    );
  }

  return (
    <div style={{ 
      position: "fixed", 
      bottom: "24px", 
      right: "24px", 
      width: isExpanded ? "800px" : "400px", 
      height: isExpanded ? "80vh" : "600px",
      maxHeight: "90vh",
      backgroundColor: "rgba(30, 30, 30, 0.85)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "16px",
      display: "flex", 
      flexDirection: "column",
      boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
      zIndex: 1000,
      transition: "width 0.3s, height 0.3s"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
          <Sparkles size={18} color="#a855f7" />
          <span>Room AI Copilot</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}>
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: "flex", gap: "8px", padding: "12px 16px" }}>
        <button 
          className={mode === "fast" ? "btn-primary" : "btn-secondary"} 
          onClick={() => setMode("fast")} 
          disabled={streaming}
          style={{ flex: 1, padding: "6px", borderRadius: "8px", fontSize: "13px" }}
        >
          ⚡ Fast
        </button>
        <button 
          className={mode === "deep" ? "btn-primary" : "btn-secondary"} 
          onClick={() => setMode("deep")} 
          disabled={streaming}
          style={{ flex: 1, padding: "6px", borderRadius: "8px", fontSize: "13px" }}
        >
          🧠 Deep
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        display: "flex", 
        flexDirection: "column", 
        gap: "16px",
        padding: "16px"
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", margin: "auto", opacity: 0.5 }}>
            <Sparkles size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <p>Ask anything about the code in this room.</p>
            <p style={{ fontSize: "12px" }}>Everyone here will see the conversation.</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} style={{ 
            background: m.role === "user" ? "rgba(255,255,255,0.05)" : "transparent",
            padding: "16px",
            borderRadius: "12px",
            borderLeft: m.role === "assistant" ? "3px solid #a855f7" : "none"
          }}>
            <strong style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: m.role === "user" ? "#4ade80" : "#a855f7" }}>
              {m.role === "user" ? "You" : "AI"}
              {m.isStreaming && <Loader2 size={12} className="animate-spin" />}
            </strong>
            {m.reasoning && (
              <details style={{ marginBottom: "12px" }}>
                <summary style={{ cursor: "pointer", opacity: 0.7, fontSize: "0.85rem", color: "#fbbf24" }}>AI Thought Process</summary>
                <div style={{ 
                  opacity: 0.7, 
                  fontSize: "0.85rem", 
                  padding: "12px", 
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  marginTop: "8px",
                  whiteSpace: "pre-wrap"
                }}>
                  {m.reasoning}
                </div>
              </details>
            )}
            <div style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem", lineHeight: 1.6 }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "12px" }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && ask()} 
          disabled={streaming} 
          placeholder="Ask a question..." 
          style={{ 
            flex: 1, 
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "24px",
            outline: "none"
          }}
        />
        <button 
          onClick={ask} 
          disabled={streaming || !input.trim()}
          style={{ 
            background: "#a855f7", 
            border: "none", 
            color: "white", 
            width: "44px", 
            height: "44px", 
            borderRadius: "50%", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            cursor: (streaming || !input.trim()) ? "not-allowed" : "pointer",
            opacity: (streaming || !input.trim()) ? 0.5 : 1
          }}
        >
          {streaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} style={{ marginLeft: "2px" }} />}
        </button>
      </div>
    </div>
  );
}
