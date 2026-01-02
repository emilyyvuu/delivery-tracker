"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createSocket } from "@/lib/socket";
import type { LocationUpdate, Order, OrderStatus } from "@/types/models";

export default function CustomerOrderTracking() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load order");
        setOrder(null);
        setStatus(null);
        return;
      }

      setOrder(data as Order);
      setStatus(data.status as OrderStatus);
    } catch (err) {
      console.error(err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!orderId) return undefined;

    const socket = createSocket();
    socket.connect();
    socket.emit("order:join", orderId);

    socket.on("location:update", (payload: LocationUpdate) => {
      if (payload.orderId !== orderId) return;
      setDriverLocation(payload);
    });

    socket.on("order:status", (payload: { orderId: string; status: OrderStatus }) => {
      if (payload.orderId !== orderId) return;
      setStatus(payload.status);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  async function onLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Track Order</h1>
          <p style={{ fontSize: 13, color: "#555" }}>{orderId}</p>
        </div>
        <button
          onClick={onLogout}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #333" }}
        >
          Log out
        </button>
      </div>

      {loading && <p style={{ marginTop: 16 }}>Loading order...</p>}
      {error && <p style={{ marginTop: 16, color: "crimson" }}>{error}</p>}

      {order && (
        <section
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Status</strong>
            <span>{status ?? order.status}</span>
          </div>
          <div>
            Pickup: {order.pickup_lat.toFixed(4)}, {order.pickup_lng.toFixed(4)}
          </div>
          <div>
            Dropoff: {order.dropoff_lat.toFixed(4)}, {order.dropoff_lng.toFixed(4)}
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 12,
          display: "grid",
          gap: 6,
        }}
      >
        <strong>Driver location</strong>
        {driverLocation ? (
          <>
            <span>
              {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </span>
            {driverLocation.timestamp && (
              <span style={{ fontSize: 12, color: "#666" }}>
                Updated at {new Date(driverLocation.timestamp).toLocaleTimeString()}
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 13, color: "#666" }}>
            Waiting for live updates...
          </span>
        )}
      </section>

      <button
        onClick={fetchOrder}
        style={{ marginTop: 16, padding: 8, borderRadius: 8, border: "1px solid #999" }}
      >
        Refresh order
      </button>
    </main>
  );
}
