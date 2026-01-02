import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { pool } from "./db";

let io: Server | null = null;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

type LocationUpdatePayload = {
  orderId: string;
  lat: number;
  lng: number;
};

/**
 * Parse and validate location update payload
 */
function parseLocationUpdate(payload: unknown): LocationUpdatePayload | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    orderId?: unknown;
    lat?: unknown;
    lng?: unknown;
  };

  if (!isNonEmptyString(data.orderId)) return null;
  if (!isFiniteNumber(data.lat) || !isFiniteNumber(data.lng)) return null;

  return {
    orderId: data.orderId,
    lat: data.lat,
    lng: data.lng,
  };
}

/**
 * Initialize Socket.io server
 */
export function initSocket(server: HttpServer) {
  const origin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

  io = new Server(server, {
    cors: {
      origin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Join order room for real-time updates
    socket.on("order:join", (orderId: unknown) => {
      if (!isNonEmptyString(orderId)) return;
      socket.join(orderId);
    });

    // Handle location updates from drivers
    socket.on("location:update", async (payload: unknown) => {
      const data = parseLocationUpdate(payload);
      if (!data) return;

      try {
        await pool.query(
          "INSERT INTO location_updates (order_id, lat, lng) VALUES ($1, $2, $3)",
          [data.orderId, data.lat, data.lng]
        );
      } catch (error) {
        console.error(error);
        return;
      }

      io?.to(data.orderId).emit("location:update", {
        orderId: data.orderId,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString(),
      });
    });
  });

  return io;
}

/**
 * Get initialized Socket.io server
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
}
