"use client";

import { useState } from "react";
import { adminClientFetch } from "@/lib/client-api";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminClientFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          placeholder="admin@newsplus.dev" autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          placeholder="••••••••" autoComplete="current-password" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors">
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
