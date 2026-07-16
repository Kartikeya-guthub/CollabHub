import { Router } from "express";
import { pool } from "../db";
import { hashPassword, comparePassword } from "../auth/hash";
import { signToken } from "../auth/jwt";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "email, password, displayName required" });
  }

  const passwordHash = await hashPassword(password);
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING id, email, display_name`,
      [email, passwordHash, displayName]
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ user, token });
  } catch (err: any) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id, email: user.email }); 
  res.json({
    user: { id: user.id, email: user.email, display_name: user.display_name },
    token,
  });
});
