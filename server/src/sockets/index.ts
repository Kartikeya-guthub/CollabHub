import { Server, Socket } from "socket.io";
import { verifyToken } from "../auth/jwt";
import { pool } from "../db";
// @ts-ignore - yjs exports both CJS and ESM, but TS node16 mode is overly strict here
import * as Y from "yjs";

// one Y.Doc per room, held in memory on this server instance
const docs = new Map<string, Y.Doc>();

const getDoc = (roomId: string): Y.Doc => {
  let doc = docs.get(roomId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(roomId, doc);
  }
  return doc;
};

interface AuthedSocket extends Socket {
  userId?: string;
}

import { pubClient, subClient } from "../redis";

const REHYDRATE_CHANNEL = "yjs-rehydrate";
const INSTANCE_ID = Math.random().toString(36).slice(2);

// each instance subscribes to a dedicated channel for cross-instance doc updates
subClient.subscribe(REHYDRATE_CHANNEL, (message: string) => {
  const { roomId, update, instanceId } = JSON.parse(message);
  if (instanceId === INSTANCE_ID) return; // ignore our own publishes

  const doc = getDoc(roomId);
  Y.applyUpdate(doc, new Uint8Array(Buffer.from(update, "base64")), "remote-instance");
});

export const registerSocketHandlers = (io: Server) => {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId}) on instance ${INSTANCE_ID}`);

    socket.on("join-room", async (roomId: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(roomId)) {
        socket.emit("join-error", { error: "Invalid Room ID format" });
        return;
      }

      const membership = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [roomId, socket.userId]
      );

      if (membership.rowCount === 0) {
        socket.emit("join-error", { error: "Not a member of this room" });
        return;
      }

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);

      // broadcast to everyone else already in the room
      socket.to(roomId).emit("user-joined", { userId: socket.userId, socketId: socket.id });

      // send current doc state to the newly-joined client
      const doc = getDoc(roomId);
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit("yjs-sync", state);
    });

    socket.on("yjs-update", ({ roomId, update }: { roomId: string; update: Uint8Array }) => {
      const doc = getDoc(roomId);
      const buf = new Uint8Array(update);
      Y.applyUpdate(doc, buf, "local-client");

      // relay to everyone else in the room
      socket.to(roomId).emit("yjs-update", update);

      // publish to Redis so every other instance rehydrates its own copy of this doc
      pubClient.publish(REHYDRATE_CHANNEL, JSON.stringify({
        roomId,
        update: Buffer.from(buf).toString("base64"),
        instanceId: INSTANCE_ID,
      }));
    });

    socket.on("awareness-update", ({ roomId, update }: { roomId: string; update: Uint8Array }) => {
      socket.to(roomId).emit("awareness-update", update);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
