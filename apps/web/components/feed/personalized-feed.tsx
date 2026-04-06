"use client";

import { useState, useEffect } from "react";
import { ArticleCard } from "@/components/article/article-card";
import type { ArticleSummary } from "@repo/types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export function PersonalizedFeed() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/v1/feed/recommended?limit=20`, { credentials: "include" })
      .then((r) => r.json())
      .then((res: { data: ArticleSummary[] }) => setArticles(res.data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">Your feed is empty</p>
        <p className="text-sm mt-2 text-neutral-400">Follow some topics to get personalized stories.</p>
        <a href="/topics" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
          Browse Topics
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
