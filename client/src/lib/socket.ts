import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token: string, portOverride?: string | null): Socket => {
  if (!socket) {
    const apiUrl = portOverride ? `http://localhost:${portOverride}` : process.env.NEXT_PUBLIC_API_URL!;
    socket = io(apiUrl, {
      auth: { token },
    });
  }
  return socket;
};
