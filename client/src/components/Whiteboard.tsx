// @ts-nocheck
"use client";
import { Tldraw, Editor } from "tldraw";
import { useSync } from "@tldraw/sync";
import "tldraw/tldraw.css";

interface WhiteboardProps {
  roomId: string;
  token: string;
  onMount?: (editor: Editor) => void;
}

export default function Whiteboard({ roomId, token, onMount }: WhiteboardProps) {
  const store = useSync({
    uri: `${process.env.NEXT_PUBLIC_WS_URL}/tldraw-sync/${roomId}?token=${token}`,
  });

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Tldraw store={store} onMount={onMount} />
    </div>
  );
}
