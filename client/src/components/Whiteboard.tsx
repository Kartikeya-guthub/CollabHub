// @ts-nocheck
"use client";
import { Tldraw, Editor } from "tldraw";
import { useSync } from "@tldraw/sync";

interface WhiteboardProps {
  roomId: string;
  token: string;
  onMount?: (editor: Editor) => void;
}

export default function Whiteboard({ roomId, token, onMount }: WhiteboardProps) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const wsUrl = baseUrl.replace(/^http/, "ws");

  const storeData = useSync({
    uri: `${wsUrl}/tldraw-sync/${roomId}?token=${token}`,
  });

  if (storeData.status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <p style={{ color: "#888" }}>Connecting to whiteboard...</p>
      </div>
    );
  }

  if (storeData.status === "error") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <p style={{ color: "red" }}>Failed to connect to whiteboard.</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Tldraw store={storeData.store} onMount={onMount} />
    </div>
  );
}
