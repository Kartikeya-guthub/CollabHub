import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const roomsRouter = Router();

roomsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { name, type } = req.body;
  const userId = req.user!.userId;

  const room = await pool.query(
    `INSERT INTO rooms (name, type, created_by) VALUES ($1, $2, $3) RETURNING *`,
    [name, type, userId]
  );

  await pool.query(
    `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
    [room.rows[0].id, userId]
  );

  res.status(201).json(room.rows[0]);
});

roomsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `SELECT r.* FROM rooms r
     JOIN room_members rm ON rm.room_id = r.id
     WHERE rm.user_id = $1
     ORDER BY r.created_at DESC`,
    [req.user!.userId]
  );
  res.json(result.rows);
});

roomsRouter.post("/:id/join", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const roomId = req.params.id as string;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    return res.status(400).json({ error: "Invalid Room ID" });
  }

  const room = await pool.query(`SELECT id FROM rooms WHERE id = $1`, [roomId]);
  if (room.rowCount === 0) return res.status(404).json({ error: "Room not found" });

  await pool.query(
    `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)
     ON CONFLICT (room_id, user_id) DO NOTHING`,
    [roomId, userId]
  );

  res.json({ joined: true, roomId });
});

roomsRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const roomId = req.params.id as string;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    return res.status(400).json({ error: "Invalid Room ID" });
  }

  const membership = await pool.query(
    `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
    [roomId, req.user!.userId]
  );

  if (membership.rowCount === 0) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  const room = await pool.query(`SELECT * FROM rooms WHERE id = $1`, [req.params.id]);
  res.json(room.rows[0]);
});
