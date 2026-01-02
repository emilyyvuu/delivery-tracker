"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { UserRole } from "@/types/models";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const registerRes = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });

    const registerData = await registerRes.json();
    if (!registerRes.ok) {
      setError(registerData.error || "Registration failed");
      return;
    }

    const loginRes = await apiFetch("/auth/login", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      setError(loginData.error || "Login failed");
      return;
    }

    if (loginData.user.role === "DRIVER") router.push("/driver/orders");
    else router.push("/customer/orders/new");
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create account</h1>

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
        <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="DRIVER">Driver</option>
          </select>
        </label>
        <button style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}>
          Create account
        </button>
      </form>

      {error && <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>}

      <p style={{ marginTop: 12, fontSize: 14 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
