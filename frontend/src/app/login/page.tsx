"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await apiFetch("/auth/login", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    // basic role redirect
    if (data.user.role === "DRIVER") router.push("/driver/orders");
    else router.push("/customer/orders/new");
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}>
          Sign in
        </button>
      </form>

      {error && <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>}
    </main>
  );
}
