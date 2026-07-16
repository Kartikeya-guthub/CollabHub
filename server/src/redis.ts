import { createClient } from "redis";

export const pubClient = createClient({ url: process.env.REDIS_URL });
export const subClient = pubClient.duplicate();

export const connectRedis = async () => {
  await Promise.all([pubClient.connect(), subClient.connect()]);
};
