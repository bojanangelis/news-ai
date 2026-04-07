"use client";

import { useState } from "react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface SummaryData {
  id: string;
  bullets: string[];
  sources: string[];
  generatedAt: string;
}

interface Props {
  articleId: string;
}

type State = "idle" | "loading" | "success" | "error" | "limit_reached";

function getOrCreateSessionId(): string {
  try {
    const key = "np_session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function ArticleSummary({ articleId }: Props) {
  const [state, setState] = useState<State>("idle");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function fetchSummary() {
    if (state === "loading" || state === "success") return;
    setState("loading");

    const sessionId = getOrCreateSessionId();
    const qs = sessionId ? `?sessionId=${sessionId}` : "";

    try {
      const res = await fetch(`${API_URL}/v1/articles/${articleId}/summary${qs}`, {
        credentials: "include",
      });

      if (res.status === 403) {
        setState("limit_reached");
        return;
      }

      if (!res.ok) throw new Error("Failed");

      const json = await res.json();
      setSummary(json.data);
      setRemaining(json.meta?.remaining ?? null);
      setState("success");
    } catch {
      setState("error");
    }
  }

  function toggleSpeech() {
    if (!summary) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(summary.bullets.join(". "));
    utterance.lang = "mk";
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  // ── IDLE: big prominent button ────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <div className="my-8 flex justify-center">
        <button
          onClick={fetchSummary}
          className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-white shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span>
            <span className="block text-base font-bold">AI Резиме</span>
            <span className="block text-xs text-white/75">Разбери ја статијата за 10 секунди</span>
          </span>
          <svg className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="my-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-6 flex items-center gap-4">
        <div className="h-6 w-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Генерирање AI резиме…</p>
          <p className="text-xs text-neutral-400 mt-0.5">Ова може да потрае неколку секунди</p>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="my-8 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-red-600 dark:text-red-400">Неуспешно вчитување на резимето.</p>
        <button
          onClick={() => { setState("idle"); fetchSummary(); }}
          className="shrink-0 text-xs font-semibold text-accent underline"
        >
          Обиди се повторно
        </button>
      </div>
    );
  }

  // ── LIMIT REACHED ─────────────────────────────────────────────────────────────
  if (state === "limit_reached") {
    return (
      <div className="my-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 mb-3">
          <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
          2/2 бесплатни резимиња искористени денес
        </p>
        <p className="text-xs text-neutral-500 mb-4">Надгради на Premium за неограничени AI резимиња</p>
        <a
          href="/premium"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          Надгради на Premium — 199 МКД/месец
        </a>
      </div>
    );
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────────
  return (
    <div className="my-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200 dark:border-amber-900/50">
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">AI Резиме</span>
        </span>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span className="text-xs text-neutral-400">{remaining} останати денес</span>
          )}
          {/* Listen button */}
          {"speechSynthesis" in window && (
            <button
              onClick={toggleSpeech}
              className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-900/50 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            >
              {isPlaying ? (
                <>
                  <svg className="h-3.5 w-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Стоп
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Слушај
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bullets */}
      <div className="px-5 py-4">
        <ul className="space-y-3">
          {summary?.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800/50 text-xs font-bold text-amber-700 dark:text-amber-300">
                {i + 1}
              </span>
              {bullet}
            </li>
          ))}
        </ul>

        {summary?.sources && summary.sources.length > 0 && (
          <p className="mt-4 text-xs text-neutral-400">Извори: {summary.sources.join(", ")}</p>
        )}

        <p className="mt-3 text-xs text-neutral-400">
          Генерирано со AI · {summary && new Date(summary.generatedAt).toLocaleDateString("mk")}
        </p>
      </div>
    </div>
  );
}
