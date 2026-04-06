"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ArticleSummary } from "@repo/types";

export function BreakingTicker({ articles }: { articles: ArticleSummary[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (articles.length <= 1) return;

    timer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % articles.length);
        setVisible(true);
      }, 400);
    }, 5000);

    return () => clearTimeout(timer.current);
  }, [idx, articles.length]);

  const article = articles[idx]!;

  return (
    <div className="bg-red-600 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-2">
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-sm bg-white text-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            Breaking
          </span>

          {articles.length > 1 && (
            <span className="shrink-0 text-red-300 text-xs font-medium tabular-nums">
              {idx + 1}/{articles.length}
            </span>
          )}

          <div className="flex-1 overflow-hidden">
            <Link
              href={`/article/${article.slug}`}
              className={`block text-sm font-medium hover:underline truncate transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
            >
              {article.title}
            </Link>
          </div>

          {articles.length > 1 && (
            <div className="shrink-0 flex gap-1.5 items-center">
              {articles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    clearTimeout(timer.current);
                    setVisible(false);
                    setTimeout(() => { setIdx(i); setVisible(true); }, 400);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === idx ? "w-4 bg-white" : "w-1.5 bg-red-400 hover:bg-red-200"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
