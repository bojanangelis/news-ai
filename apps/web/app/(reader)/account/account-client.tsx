"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/client-api";
import type { PaymentCard } from "./page";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface NotificationPrefs {
  briefing: boolean;
  breaking: boolean;
  topicFollows: boolean;
}

interface Props {
  initialUser: User;
  initialSub: SubscriptionStatus | null;
  initialCards: PaymentCard[];
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const CARD_CLASS =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6";
const SECTION_LABEL =
  "text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4";
const INPUT_CLASS =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors";
const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50";
const BTN_GHOST =
  "inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 transition-colors";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активна",
  TRIALING: "Пробен период",
  CANCELLED: "Откажана",
  EXPIRED: "Истечена",
  PAST_DUE: "Задоцнета уплата",
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
        on ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Card brand display ───────────────────────────────────────────────────────

function CardBrand({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b === "visa") {
    return (
      <div className="w-10 h-7 rounded bg-gradient-to-br from-[#1a1f71] to-[#0070ba] flex items-center justify-center shrink-0">
        <span className="text-white text-[9px] font-bold">VISA</span>
      </div>
    );
  }
  if (b === "mastercard") {
    return (
      <div className="w-10 h-7 rounded bg-gradient-to-br from-[#eb001b] to-[#f79e1b] flex items-center justify-center shrink-0">
        <span className="text-white text-[8px] font-bold">MC</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-7 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
      <span className="text-neutral-500 text-[9px] font-bold uppercase">{brand.slice(0, 4)}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccountClient({ initialUser, initialSub, initialCards }: Props) {
  const router = useRouter();
  const user = initialUser;

  const [sub, setSub] = useState<SubscriptionStatus | null>(initialSub);
  const [cards] = useState<PaymentCard[]>(initialCards);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Profile edit ──────────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user.name, email: user.email });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Language ─────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState("mk");
  useEffect(() => {
    setLanguage(localStorage.getItem("np_lang") ?? "mk");
  }, []);

  // ── Notification prefs ────────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    briefing: true,
    breaking: false,
    topicFollows: false,
  });
  useEffect(() => {
    const saved = localStorage.getItem("np_notification_prefs");
    if (saved) {
      try {
        setNotifPrefs(JSON.parse(saved) as NotificationPrefs);
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  function toggleNotif(key: keyof NotificationPrefs) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("np_notification_prefs", JSON.stringify(next));
      return next;
    });
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    localStorage.setItem("np_lang", lang);
  }

  // ── Subscription actions ──────────────────────────────────────────────────
  const [cancelling, setCancelling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  async function handleStartTrial() {
    setStartingTrial(true);
    try {
      const res = await fetch("/api/subscription/trial", { method: "POST" });
      const json = await res.json() as { data?: { message?: string }; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Грешка");
      setMessage({ type: "success", text: json.data?.message ?? "Пробниот период е активиран!" });
      setSub((prev) => ({ ...prev!, status: "TRIALING", isPremium: true }));
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Грешка при активирање" });
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
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Грешка при откажување" });
    } finally {
      setCancelling(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      // TODO: implement PATCH /v1/auth/me on the API side (Phase 2)
      // await clientFetch("/auth/me", { method: "PATCH", body: JSON.stringify(profileForm) });
      await new Promise((r) => setTimeout(r, 400)); // placeholder delay
      setMessage({ type: "success", text: "Profile saved (API integration pending)." });
      setEditingProfile(false);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    window.location.href = "/";
  }

  const isPremium = user.isPremium || !!sub?.isPremium;
  const planLabel =
    sub?.plan === "yearly" ? "Годишна" : sub?.plan === "monthly" ? "Месечна" : "—";

  // Notification rows config
  const notifRows: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
    { key: "briefing",     label: "Дневен брифинг",                desc: "Утринска сумаризација во 07:00" },
    { key: "breaking",     label: "Скршени вести",                 desc: "Итни вести во реално време" },
    { key: "topicFollows", label: "Нови написи од следени теми",   desc: "Кога ќе се објави нов напис" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Мој профил</h1>

      {/* Message banner */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* ── 1. Profile ─────────────────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <h2 className={SECTION_LABEL}>Профил</h2>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold text-accent shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user.name}</p>
            <p className="text-sm text-neutral-500 truncate">{user.email}</p>
            {user.role !== "READER" && (
              <p className="text-xs text-neutral-400 mt-0.5 capitalize">{user.role.toLowerCase()}</p>
            )}
          </div>
          {isPremium && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
              Premium
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditingProfile((v) => !v)}
            className="shrink-0 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            {editingProfile ? "Откажи" : "Уреди"}
          </button>
        </div>

        {editingProfile && (
          <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Полно ime</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className={BTN_PRIMARY}
              >
                {savingProfile ? "Зачувување…" : "Зачувај"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Language & Reading ───────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <h2 className={SECTION_LABEL}>Читање и јазик</h2>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Јазик на интерфејс</p>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="mk">🇲🇰 Македонски</option>
              <option value="en">🇬🇧 English</option>
              {/* TODO: add value="sq" (Albanian) */}
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Омилени категории</p>
              <p className="text-xs text-neutral-400 mt-0.5">Одбери ги темите кои те интересираат</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Уреди
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Notifications ────────────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <h2 className={SECTION_LABEL}>Известувања</h2>
        {/* TODO: wire to push notification API when available */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {notifRows.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
              </div>
              <Toggle on={notifPrefs[key]} onToggle={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Subscription + Cards ─────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${SECTION_LABEL} mb-0`}>Претплата</h2>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <>
                <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
                  ● Premium
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xs text-neutral-500 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Откажување…" : "Деактивирај"}
                </button>
              </>
            ) : (
              <>
                <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-500">
                  ● Бесплатно
                </span>
                <Link
                  href="/premium"
                  className="text-xs font-semibold text-white bg-indigo-600 rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors"
                >
                  Надгради →
                </Link>
              </>
            )}
          </div>
        </div>

        {isPremium && sub?.status ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <div className="flex justify-between text-sm py-2.5">
              <span className="text-neutral-500">Статус</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {STATUS_LABEL[sub.status] ?? sub.status}
              </span>
            </div>
            {sub.plan && (
              <div className="flex justify-between text-sm py-2.5">
                <span className="text-neutral-500">План</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{planLabel}</span>
              </div>
            )}
            {sub.daysLeft !== null && sub.status === "ACTIVE" && (
              <div className="flex justify-between text-sm py-2.5">
                <span className="text-neutral-500">Следна наплата за</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{sub.daysLeft} дена</span>
              </div>
            )}
            {sub.trialDaysLeft !== null && sub.status === "TRIALING" && (
              <div className="flex justify-between text-sm py-2.5">
                <span className="text-neutral-500">Пробен период истекува за</span>
                <span className="font-medium text-amber-600">{sub.trialDaysLeft} дена</span>
              </div>
            )}

            {/* Payment cards */}
            <div className="pt-4 pb-1">
              <p className="text-xs font-semibold text-neutral-500 mb-3">Платежни картички</p>
              {cards.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {cards.map((card) => {
                    const isExpired = new Date(card.expYear, card.expMonth - 1) < new Date();
                    return (
                      <div
                        key={card.id}
                        className={`flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 ${
                          isExpired ? "opacity-60" : ""
                        }`}
                      >
                        <CardBrand brand={card.brand} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            •••• •••• •••• {card.last4}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Истекува {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold rounded-md px-2 py-0.5 shrink-0 ${
                            isExpired
                              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {isExpired ? "Истечена" : "Активна"}
                        </span>
                        {/* TODO: wire to DELETE /v1/payment/cards/:id (Stripe Phase 2) */}
                        <button
                          type="button"
                          onClick={() => alert("Card removal coming in Phase 2")}
                          className="text-neutral-400 hover:text-red-500 transition-colors text-sm shrink-0"
                          aria-label="Remove card"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-neutral-400 mb-3">Нема зачувани картички.</p>
              )}
              {/* TODO: open Stripe Elements sheet (Phase 2) */}
              <button
                type="button"
                onClick={() => alert("Add card — Stripe integration coming in Phase 2")}
                className="w-full h-10 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-sm text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Додај картичка
              </button>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link href="/premium" className={`${BTN_GHOST} flex-1 justify-center`}>
                Погледни планови
              </Link>
              {sub.status !== "CANCELLED" && sub.status !== "EXPIRED" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={`${BTN_GHOST} flex-1 hover:border-red-300 hover:text-red-600`}
                >
                  {cancelling ? "Откажување…" : "Откажи претплата"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Немаш активна претплата.
            </p>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={startingTrial}
              className={BTN_PRIMARY}
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
        )}
      </div>

      {/* ── 5. Logout ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-neutral-900 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">Излез</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-10 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Одјави се
        </button>
      </div>
    </div>
  );
}
