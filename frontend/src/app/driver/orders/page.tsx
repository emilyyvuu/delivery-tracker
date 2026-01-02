"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Order } from "@/types/models";

export default function DriverOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
