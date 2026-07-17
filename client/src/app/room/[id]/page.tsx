// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { getSocket } from "@/lib/socket";
import { bindYjsToSocket } from "@/lib/yjsProvider";
import dynamic from "next/dynamic";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { GripVertical, GripHorizontal } from "lucide-react";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), { ssr: false });
const Whiteboard = dynamic(() => import("@/components/Whiteboard"), { ssr: false });
import UnifiedPresenceList from "@/components/UnifiedPresenceList";
import ConsolePanel from "@/components/ConsolePanel";
import AskAIPanel from "@/components/AskAIPanel";
import DiagramGenerator from "@/components/DiagramGenerator";
import { initLocalPresence } from "@/lib/presence";
import { Socket } from "socket.io-client";

interface RoomMeta {
  id: string;
  name: string;
  type: "code" | "whiteboard" | "both";
  created_at: string;
}

export default function RoomPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const portOverride = searchParams.get("port");
  const router = useRouter();
  
  const [room, setRoom] = useState<RoomMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/test-auth");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (res.status === 403) {
          // Not a member, try to auto-join
          const joinRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${id}/join`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (joinRes.ok) {
            // Re-fetch room data after joining
            const retryRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (retryRes.ok) return retryRes.json();
          }
        }
        if (!res.ok) throw new Error("Room not found or access denied");
        return res.json();
      })
      .then(data => setRoom(data))
      .catch(err => {
        setError(err.message);
        router.push("/dashboard");
      });

    const userId = localStorage.getItem("userId") || `anon-${Math.random().toString(36).substring(7)}`;
    const displayName = localStorage.getItem("displayName") || `User ${userId.substring(0,4)}`;

    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    
    initLocalPresence(awareness, userId, displayName);
    
    docRef.current = doc;
    awarenessRef.current = awareness;

    const newSocket = getSocket(token, portOverride);
    setSocket(newSocket);

    newSocket.on("join-error", (data) => {
      console.error("Socket join error:", data.error);
      alert(data.error);
      router.push("/dashboard");
    });

    newSocket.emit("join-room", id);
    bindYjsToSocket(doc, newSocket, id as string, awareness);

    return () => {
      newSocket.off("join-error");
      awareness.destroy();
      doc.destroy();
    };
  }, [id, portOverride, router]);

  if (error) return null;
  if (!room || !docRef.current || !awarenessRef.current) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#0f0f11", color: "white" }}>
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", borderRadius: "16px" }}>
          <h2 style={{ fontWeight: 500 }}>Connecting to Workspace...</h2>
        </div>
      </div>
    );
  }

  // Common UI for Resize Handles
  const VerticalHandle = () => (
    <PanelResizeHandle style={{ width: "8px", background: "#1e1e1e", cursor: "col-resize", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "2px", height: "30px", background: "#333", borderRadius: "2px" }} />
    </PanelResizeHandle>
  );

  const HorizontalHandle = () => (
    <PanelResizeHandle style={{ height: "8px", background: "#1e1e1e", cursor: "row-resize", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ height: "2px", width: "30px", background: "#333", borderRadius: "2px" }} />
    </PanelResizeHandle>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0f0f11" }}>
      {/* Top Navigation Bar */}
      <div style={{ 
        margin: "12px", 
        padding: "12px 24px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        backgroundColor: "rgba(30, 30, 30, 0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "12px",
        zIndex: 10,
        color: "white"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }} onClick={() => router.push("/dashboard")}>← Dashboard</button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: 600 }}>{room.name}</span>
            <span style={{ fontSize: "0.8rem", padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", textTransform: "capitalize", marginLeft: "4px" }}>
              {room.type} Mode
            </span>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <UnifiedPresenceList awareness={awarenessRef.current} editor={editor} layout="horizontal" />
          </div>
          <button 
            style={{ background: "#a855f7", border: "none", color: "white", padding: "6px 16px", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
            onClick={() => {
              const link = `${window.location.origin}/room/${room.id}/join`;
              navigator.clipboard.writeText(link);
              alert("Room link copied to clipboard!");
            }}
          >
            Share Room
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 12px 12px 12px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
        
        {room.type === "code" && (
          <PanelGroup direction="vertical" style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Panel defaultSize={70} minSize={20}>
              <CodeEditor doc={docRef.current} awareness={awarenessRef.current} />
            </Panel>
            <HorizontalHandle />
            <Panel defaultSize={30} minSize={10}>
              <ConsolePanel 
                roomId={id as string} 
                getCode={() => docRef.current?.getText("monaco").toString() || ""}
                language="c++"
                token={localStorage.getItem("token") || ""}
                doc={docRef.current}
              />
            </Panel>
          </PanelGroup>
        )}

        {room.type === "whiteboard" && (
          <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#fafafa" }}>
            <Whiteboard 
              roomId={id as string} 
              token={localStorage.getItem("token") || ""} 
              doc={docRef.current}
              onMount={(ed) => {
                setEditor(ed);
              }}
            />
            <DiagramGenerator editor={editor} token={localStorage.getItem("token") || ""} doc={docRef.current} />
          </div>
        )}

        {room.type === "both" && (
          <PanelGroup direction="horizontal" style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Panel defaultSize={50} minSize={20}>
              <PanelGroup direction="vertical">
                <Panel defaultSize={70} minSize={20}>
                  <CodeEditor doc={docRef.current} awareness={awarenessRef.current} />
                </Panel>
                <HorizontalHandle />
                <Panel defaultSize={30} minSize={10}>
                  <ConsolePanel 
                    roomId={id as string} 
                    getCode={() => docRef.current?.getText("monaco").toString() || ""}
                    language="c++"
                    token={localStorage.getItem("token") || ""}
                    doc={docRef.current}
                  />
                </Panel>
              </PanelGroup>
            </Panel>
            
            <VerticalHandle />
            
            <Panel defaultSize={50} minSize={20} style={{ backgroundColor: "#fafafa", position: "relative" }}>
              <Whiteboard 
                roomId={id as string} 
                token={localStorage.getItem("token") || ""} 
                doc={docRef.current}
                onMount={(ed) => {
                  setEditor(ed);
                }}
              />
              <DiagramGenerator editor={editor} token={localStorage.getItem("token") || ""} doc={docRef.current} />
            </Panel>
          </PanelGroup>
        )}
      </div>

      {/* Floating Global AI Chat - only show if not just a whiteboard */}
      {room.type !== "whiteboard" && (
        <AskAIPanel 
          doc={docRef.current}
          getCode={() => docRef.current?.getText("monaco").toString() || ""}
          language="c++"
          token={localStorage.getItem("token") || ""}
        />
      )}
    </div>
  );
}
