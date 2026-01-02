"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function DriverOrders() {
  const router = useRouter();

  async function onLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Driver Orders (placeholder)</span>
        <button
          onClick={onLogout}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #333" }}
        >
          Log out
        </button>
      </div>
    </main>
  );
}
