"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt: string;
  isExternal?: boolean;
  category: { name: string; slug: string };
}

interface Props {
  article: Article;
  index: number;
}

type AiState = "idle" | "loading" | "loaded" | "error";

interface IntelligenceSummary {
  deepAnalysis: string;
  isPremium: boolean;
}

export function BriefingArticleCard({ article, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [intel, setIntel] = useState<IntelligenceSummary | null>(null);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (aiState !== "idle") return; // already loaded or loading
    setAiState("loading");

    try {
      const res = await fetch(`${API_URL}/v1/articles/${article.id}/intelligence`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed");

      const json = await res.json() as {
        data: {
          data: { deepAnalysis: string };
          meta: { isPremium: boolean };
        };
      };

      setIntel({
        deepAnalysis: json.data.data.deepAnalysis,
        isPremium: json.data.meta.isPremium,
      });
      setAiState("loaded");
    } catch {
      setAiState("error");
    }
  }

  const timeLabel = new Date(article.publishedAt).toLocaleTimeString("mk-MK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // First paragraph of analysis for the preview
  const analysisPreview = intel?.deepAnalysis.split("\n\n")[0] ?? "";

  return (
    <li className="group">
      {/* Main card row */}
      <button
        onClick={handleExpand}
        className="w-full text-left flex gap-4 items-start py-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 rounded-xl px-3 -mx-3 transition-colors"
      >
        {/* Number badge */}
        <span className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
          expanded
            ? "bg-indigo-600 text-white"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600"
        }`}>
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide text-accent">
              {article.category.name}
            </span>
            <span className="text-xs text-neutral-400">{timeLabel}</span>
            {article.isExternal && (
              <span className="text-[10px] font-medium text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5">
                Надворешен извор
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2">
            {article.title}
          </h2>
          {!expanded && article.excerpt && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* Thumbnail */}
        {article.coverImageUrl && (
          <div className="shrink-0 hidden sm:block">
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              width={72}
              height={54}
              className="rounded-lg object-cover w-[72px] h-[54px]"
            />
          </div>
        )}

        {/* Expand chevron */}
        <span className={`shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
          <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Expanded AI panel */}
      {expanded && (
        <div className="mx-3 mb-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 overflow-hidden">
          {/* AI header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-indigo-100 dark:border-indigo-900/40">
            <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">AI Анализа</span>
          </div>

          <div className="px-4 py-3">
            {aiState === "loading" && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
                <span className="text-xs text-neutral-500">Генерирање анализа…</span>
              </div>
            )}

            {aiState === "error" && (
              <p className="text-xs text-red-500 py-2">Неуспешно вчитување. Обиди се повторно.</p>
            )}

            {aiState === "loaded" && intel && (
              <div className="space-y-3">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {analysisPreview}
                </p>
                {!intel.isPremium && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">
                    <Link href="/premium" className="underline font-semibold">Надгради на Premium</Link>
                    {" "}за целосна анализа, контекст и AI разговор
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
              {article.isExternal ? (
                <>
                  <Link
                    href={`/article/${article.slug}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Читај на NewsPlus
                  </Link>
                  <span className="text-neutral-200 dark:text-neutral-700">|</span>
                  <a
                    href={`/article/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Оригинал
                  </a>
                </>
              ) : (
                <Link
                  href={`/article/${article.slug}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Читај целосна статија
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
