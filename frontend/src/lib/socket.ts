import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

export function createSocket(): Socket {
  return io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
  });
}
