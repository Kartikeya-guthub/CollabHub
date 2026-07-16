// Force server restart again 4
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth";
import { roomsRouter } from "./routes/rooms";
import { executeRouter } from "./routes/execute";
import { aiRouter } from "./routes/ai";
import { registerSocketHandlers } from "./sockets";

import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient, connectRedis } from "./redis";

const app = express();
app.use(express.json());
app.use(cors({ 
  origin: true,
  credentials: true 
}));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/ai", aiRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: true,
    credentials: true
  },
});

app.use("/api/execute", executeRouter(io));

import { attachTldrawSync } from "./tldrawSync";

const startServer = async () => {
  await connectRedis();
  io.adapter(createAdapter(pubClient, subClient));
  registerSocketHandlers(io);

  attachTldrawSync(httpServer);

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => console.log(`Server on ${PORT}`));
};

startServer();
