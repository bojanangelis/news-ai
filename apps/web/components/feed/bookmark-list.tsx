"use client";

import { useState, useEffect } from "react";
import { ArticleCard } from "@/components/article/article-card";
import { bookmarksApi } from "@/lib/client-api";
import type { ArticleSummary } from "@repo/types";

export function BookmarkList({ userId: _ }: { userId: string }) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookmarksApi
      .list()
      .then((res) => {
        const data = (res as { data: Array<{ article: ArticleSummary }> }).data;
        setArticles(data.map((b) => b.article));
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <p className="text-lg font-medium">No saved articles yet</p>
        <p className="text-sm mt-1">Tap the bookmark icon on any article to save it here.</p>
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
