// @ts-nocheck
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, Editor, createTLStore, defaultShapeUtils } from "tldraw";

interface WhiteboardProps {
  roomId: string;
  token: string;
  onMount?: (editor: Editor) => void;
}

/**
 * Whiteboard that always renders a working local tldraw canvas.
 * Real-time sync will be layered on top via Yjs in a future iteration;
 * for now the canvas is fully functional for drawing + AI diagram generation.
 */
export default function Whiteboard({ roomId, token, onMount }: WhiteboardProps) {
  const [store] = useState(() =>
    createTLStore({ shapeUtils: defaultShapeUtils })
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      onMount?.(editor);
    },
    [onMount]
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Tldraw store={store} onMount={handleMount} />
    </div>
  );
}
