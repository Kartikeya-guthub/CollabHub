import { WebSocketServer } from "ws";
import { Server as HttpServer } from "http";
import { TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema } from "@tldraw/tlschema";
import { verifyToken } from "../auth/jwt";
import { pool } from "../db";
import { URL } from "url";

const schema = createTLSchema();
const rooms = new Map<string, any>();

const getOrCreateRoom = (roomId: string): any => {
  let room = rooms.get(roomId);
  if (!room) {
    room = new TLSocketRoom<any, any>({
      schema,
      onSessionRemoved: (r: any, { numSessionsRemaining }: any) => {
        if (numSessionsRemaining === 0) {
          r.close();
          rooms.delete(roomId);
        }
      },
    });
    rooms.set(roomId, room);
  }
  return room;
};

export const attachTldrawSync = (httpServer: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    // let Socket.IO handle its own path; only intercept ours
    if (!url.pathname.startsWith("/tldraw-sync/")) return;

    const roomId = url.pathname.split("/")[2];
    const token = url.searchParams.get("token");
    const sessionId = url.searchParams.get("sessionId") || Math.random().toString(36).substring(7);

    if (!token) return socket.destroy();

    let userId: string;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return socket.destroy();
    }

    // reuse the same room_members check from Phase 8 — same auth model, different transport
    try {
      const membership = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );
      if (membership.rowCount === 0) return socket.destroy();
    } catch (e) {
      console.error(e);
      return socket.destroy();
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const room = getOrCreateRoom(roomId);
      room.handleSocketConnect({ sessionId, socket: ws as any });
    });
  });
};
