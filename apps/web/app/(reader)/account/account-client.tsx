"use client";

import { useState } from "react";
import Link from "next/link";

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

interface Props {
  initialUser: User;
  initialSub: SubscriptionStatus | null;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активна",
  TRIALING: "Пробен период",
  CANCELLED: "Откажана",
  EXPIRED: "Истечена",
  PAST_DUE: "Задоцнета уплата",
};

export function AccountClient({ initialUser, initialSub }: Props) {
  const [sub, setSub] = useState<SubscriptionStatus | null>(initialSub);
  const [cancelling, setCancelling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const user = initialUser;

  async function handleStartTrial() {
    setStartingTrial(true);
    try {
      const res = await fetch("/api/subscription/trial", { method: "POST" });
      const json = await res.json() as { data?: { message?: string }; message?: string };
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
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "DELETE" });
      const json = await res.json() as { message?: string };
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

  const planLabel = sub?.plan === "yearly" ? "Годишна" : sub?.plan === "monthly" ? "Месечна" : "—";

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
            {user.role !== "READER" && (
              <p className="text-xs text-neutral-400 mt-0.5 capitalize">{user.role.toLowerCase()}</p>
            )}
          </div>
          {(user.isPremium || sub?.isPremium) && (
            <span className="ml-auto rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Subscription card */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Претплата</h2>

        {!sub?.status ? (
          <div className="text-center py-4">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">Немаш активна претплата.</p>
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
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
                {STATUS_LABEL[sub.status ?? ""] ?? sub.status}
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
                className="flex-1 flex h-10 items-center justify-center rounded-xl border border-indigo-600 text-indigo-600 text-sm font-semibold hover:bg-indigo-600 hover:text-white transition-colors"
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
