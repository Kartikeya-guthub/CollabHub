"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";
import { SyncYjsExcalidraw } from "@mizuka-wu/y-excalidraw";
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to prevent SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

interface WhiteboardProps {
  roomId: string;
  token: string;
  doc: Y.Doc;
  onMount?: (api: any) => void;
}

export default function Whiteboard({ roomId, token, doc, onMount }: WhiteboardProps) {
  const [isClient, setIsClient] = useState(false);
  const excalidrawApiRef = useRef<any>(null);
  const syncBindingRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (excalidrawApiRef.current && doc) {
      // Clean up previous binding if it exists
      if (syncBindingRef.current) {
        syncBindingRef.current.destroy();
      }

      // We bind the Y.Array directly to the Excalidraw API
      syncBindingRef.current = new SyncYjsExcalidraw(
        doc.getArray("excalidraw-elements"),
        excalidrawApiRef.current
      );
    }
    return () => {
      if (syncBindingRef.current) {
        syncBindingRef.current.destroy();
      }
    };
  }, [doc, excalidrawApiRef.current]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isClient && (
        <Excalidraw
          excalidrawAPI={(api: any) => {
            excalidrawApiRef.current = api;
            if (onMount) onMount(api);
          }}
        />
      )}
    </div>
  );
}
