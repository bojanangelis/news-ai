"use client";

import { useState, useEffect, useRef } from "react";
import { ArticleCard } from "@/components/article/article-card";
import type { ArticleSummary } from "@repo/types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface Props {
  initialPage: number;
  totalPages: number;
  category?: string;
}

export function InfiniteFeed({ initialPage, totalPages, category }: Props) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(initialPage + 1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  });

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "20", ...(category && { category }) }).toString();
      const res = await fetch(`${API_URL}/v1/articles?${qs}`);
      const json = await res.json() as { data: { data: ArticleSummary[]; totalPages: number } };
      setArticles((prev) => [...prev, ...json.data.data]);
      setPage((p) => p + 1);
      setHasMore(page < json.data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {articles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {loading && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
