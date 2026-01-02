"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { Order } from "@/types/models";

type LivePosition = {
  lat: number;
  lng: number;
};

export default function DriverOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [liveOrderId, setLiveOrderId] = useState<string | null>(null);
  const [livePosition, setLivePosition] = useState<LivePosition | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const loadOrders = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/driver/orders", { method: "GET" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load orders");
        setOrders([]);
        return;
      }

      setOrders(data.orders ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const stopLiveUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    progressRef.current = 0;
    setLiveOrderId(null);
    setLivePosition(null);
  }, []);

  const startLiveUpdates = useCallback(
    (order: Order) => {
      const socket = socketRef.current;
      if (!socket) return;

      stopLiveUpdates();
      socket.emit("order:join", order.id);

      progressRef.current = 0;
      setLiveOrderId(order.id);

      const emitUpdate = () => {
        const nextProgress = Math.min(1, progressRef.current + 0.05);
        progressRef.current = nextProgress;

        const lat =
          order.pickup_lat + (order.dropoff_lat - order.pickup_lat) * nextProgress;
        const lng =
          order.pickup_lng + (order.dropoff_lng - order.pickup_lng) * nextProgress;

        setLivePosition({ lat, lng });
        socket.emit("location:update", {
          orderId: order.id,
          lat,
          lng,
        });
      };

      emitUpdate();
      intervalRef.current = setInterval(emitUpdate, 3000);
    },
    [stopLiveUpdates]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const socket = createSocket();
    socket.connect();
    socketRef.current = socket;

    return () => {
      stopLiveUpdates();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [stopLiveUpdates]);

  async function onLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function onStart(orderId: string) {
    setActionId(orderId);
    setError(null);

    try {
      const res = await apiFetch(`/orders/${orderId}/start`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start order");
        return;
      }

      setOrders((prev) => prev.map((order) => (order.id === orderId ? data : order)));
      startLiveUpdates(data as Order);
    } catch (err) {
      console.error(err);
      setError("Failed to start order");
    } finally {
      setActionId(null);
    }
  }

  async function onComplete(orderId: string) {
    setActionId(orderId);
    setError(null);

    try {
      const res = await apiFetch(`/orders/${orderId}/complete`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to complete order");
        return;
      }

      setOrders((prev) => prev.map((order) => (order.id === orderId ? data : order)));
      if (liveOrderId === orderId) {
        stopLiveUpdates();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to complete order");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Driver Orders</h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "#444" }}>
            View assigned orders and update delivery status.
          </p>
        </div>
        <button
          onClick={onLogout}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #333" }}
        >
          Log out
        </button>
      </div>

      {liveOrderId && (
        <section
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fafafa",
            display: "grid",
            gap: 6,
          }}
        >
          <strong>Live updates active</strong>
          <span style={{ fontSize: 12, color: "#666" }}>{liveOrderId}</span>
          {livePosition && (
            <span style={{ fontSize: 13 }}>
              Sending: {livePosition.lat.toFixed(4)}, {livePosition.lng.toFixed(4)}
            </span>
          )}
          <button
            onClick={stopLiveUpdates}
            style={{
              width: 120,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #999",
              background: "#fff",
            }}
          >
            Stop live
          </button>
        </section>
      )}

      {loading && <p style={{ marginTop: 16 }}>Loading orders...</p>}
      {error && <p style={{ marginTop: 16, color: "crimson" }}>{error}</p>}

      {!loading && orders.length === 0 && (
        <p style={{ marginTop: 16 }}>No assigned orders yet.</p>
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {orders.map((order) => {
          const isStarting = actionId === order.id && order.status === "ASSIGNED";
          const isCompleting = actionId === order.id && order.status === "IN_PROGRESS";

          return (
            <section
              key={order.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>Order</strong>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{order.id}</div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid #999",
                    fontSize: 12,
                  }}
                >
                  {order.status}
                </span>
              </div>

              <div style={{ fontSize: 14, color: "#333" }}>
                <div>
                  Pickup: {order.pickup_lat.toFixed(4)}, {order.pickup_lng.toFixed(4)}
                </div>
                <div>
                  Dropoff: {order.dropoff_lat.toFixed(4)}, {order.dropoff_lng.toFixed(4)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onStart(order.id)}
                  disabled={order.status !== "ASSIGNED" || actionId === order.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #333",
                    background: order.status === "ASSIGNED" ? "#fff" : "#f2f2f2",
                    cursor: order.status === "ASSIGNED" ? "pointer" : "not-allowed",
                  }}
                >
                  {isStarting ? "Starting..." : "Start"}
                </button>
                <button
                  onClick={() => onComplete(order.id)}
                  disabled={order.status !== "IN_PROGRESS" || actionId === order.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #333",
                    background: order.status === "IN_PROGRESS" ? "#fff" : "#f2f2f2",
                    cursor: order.status === "IN_PROGRESS" ? "pointer" : "not-allowed",
                  }}
                >
                  {isCompleting ? "Completing..." : "Complete"}
                </button>
                <button
                  onClick={loadOrders}
                  disabled={actionId === order.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #999",
                    background: "#fff",
                    color: "#333",
                  }}
                >
                  Refresh
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
