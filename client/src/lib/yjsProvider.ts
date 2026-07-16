import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { Socket } from "socket.io-client";

export const bindYjsToSocket = (doc: Y.Doc, socket: Socket, roomId: string, awareness: Awareness) => {
  socket.on("yjs-sync", (state: Uint8Array) => {
    Y.applyUpdate(doc, new Uint8Array(state), "remote");
  });

  socket.on("yjs-update", (update: Uint8Array) => {
    Y.applyUpdate(doc, new Uint8Array(update), "remote");
  });

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    // avoid re-broadcasting updates that came from the socket itself
    if (origin === "remote") return;
    socket.emit("yjs-update", { roomId, update });
  });

  // awareness wiring — inert until Phase 7 broadcasts cursor/name/color
  awareness.on("update", ({ added, updated, removed }: any, origin: unknown) => {
    if (origin === "remote") return;
    const changed = [...added, ...updated, ...removed];
    const update = require("y-protocols/awareness").encodeAwarenessUpdate(awareness, changed);
    socket.emit("awareness-update", { roomId, update });
  });

  socket.on("awareness-update", (update: Uint8Array) => {
    const { applyAwarenessUpdate } = require("y-protocols/awareness");
    applyAwarenessUpdate(awareness, new Uint8Array(update), "remote");
  });
};
