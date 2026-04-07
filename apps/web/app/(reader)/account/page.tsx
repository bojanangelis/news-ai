"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface SubscriptionStatus {
  isPremium: boolean;
  status: string | null;
  plan: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
  trialDaysLeft: number | null;
  cancelledAt: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]!) : null;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = getCookie("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_URL}/v1/auth/me`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API_URL}/v1/subscription/status`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([meRes, subRes]) => {
        setUser(meRes.data ?? meRes);
        setSub(subRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStartTrial() {
    const token = getCookie("access_token");
    if (!token) return;
    setStartingTrial(true);
    try {
      const res = await fetch(`${API_URL}/v1/subscription/trial`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Грешка");
      setMessage({ type: "success", text: json.data?.message ?? "Пробниот период е активиран!" });
      setSub((prev) => ({ ...prev!, status: "TRIALING", isPremium: true }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Грешка при активирање";
      setMessage({ type: "error", text: msg });
    } finally {
      setStartingTrial(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Дали си сигурен дека сакаш да ја откажеш претплатата?")) return;
    const token = getCookie("access_token");
    if (!token) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_URL}/v1/subscription/cancel`, {
        method: "DELETE",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Грешка");
      setMessage({ type: "success", text: "Претплатата е откажана." });
      setSub((prev) => ({ ...prev!, status: "CANCELLED", cancelledAt: new Date().toISOString() }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Грешка при откажување";
      setMessage({ type: "error", text: msg });
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Потребна е најава</h1>
        <p className="text-neutral-500 mb-6">Најави се за да го видиш твојот профил и претплата.</p>
        <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-8 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
          Најави се
        </Link>
      </div>
    );
  }

  const planLabel = sub?.plan === "yearly" ? "Годишна" : sub?.plan === "monthly" ? "Месечна" : "—";
  const statusLabel: Record<string, string> = {
    ACTIVE: "Активна",
    TRIALING: "Пробен период",
    CANCELLED: "Откажана",
    EXPIRED: "Истечена",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-8">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Мој профил</h1>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Profile card */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Профил</h2>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold text-accent">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
          {user.isPremium && (
            <span className="ml-auto rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Subscription card */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Претплата</h2>

        {!sub || !sub.status ? (
          <div className="text-center py-4">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">Немаш активна претплата.</p>
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-60"
            >
              {startingTrial ? "Активирање…" : "Почни 7-дневен пробен период"}
            </button>
            <p className="mt-2 text-xs text-neutral-400">
              Или{" "}
              <Link href="/premium" className="text-accent underline">
                погледни ги плановите
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Статус</span>
              <span className={`font-semibold ${sub.isPremium ? "text-green-600 dark:text-green-400" : "text-neutral-400"}`}>
                {statusLabel[sub.status ?? ""] ?? sub.status}
              </span>
            </div>
            {sub.plan && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">План</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{planLabel}</span>
              </div>
            )}
            {sub.trialDaysLeft !== null && sub.status === "TRIALING" && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Пробен период истекува за</span>
                <span className="font-medium text-amber-600">{sub.trialDaysLeft} дена</span>
              </div>
            )}
            {sub.daysLeft !== null && sub.status === "ACTIVE" && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Следна наплата за</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{sub.daysLeft} дена</span>
              </div>
            )}
            {sub.expiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Важи до</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {new Date(sub.expiresAt).toLocaleDateString("mk-MK")}
                </span>
              </div>
            )}
            {sub.cancelledAt && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Откажана на</span>
                <span className="font-medium text-neutral-400">
                  {new Date(sub.cancelledAt).toLocaleDateString("mk-MK")}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
              <Link
                href="/premium"
                className="flex-1 flex h-10 items-center justify-center rounded-xl border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-white transition-colors"
              >
                Погледни планови
              </Link>
              {sub.status !== "CANCELLED" && sub.status !== "EXPIRED" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 flex h-10 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-sm hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-60"
                >
                  {cancelling ? "Откажување…" : "Откажи претплата"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
