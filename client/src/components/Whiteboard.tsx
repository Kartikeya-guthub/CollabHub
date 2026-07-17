"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to prevent SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

interface WhiteboardProps {
  roomId: string;
  token: string;
  onMount?: (api: any) => void;
}

export default function Whiteboard({ roomId, token, onMount }: WhiteboardProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isClient && (
        <Excalidraw
          excalidrawAPI={(api: any) => {
            if (onMount) onMount(api);
          }}
        />
      )}
    </div>
  );
}
