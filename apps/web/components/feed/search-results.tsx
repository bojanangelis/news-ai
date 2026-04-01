"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArticleCard } from "@/components/article/article-card";
import { searchApi } from "@/lib/client-api";
import type { ArticleSummary } from "@repo/types";

interface Props {
  initialQuery: string;
  category?: string;
  page?: number;
}

export function SearchResults({ initialQuery, category, page = 1 }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ArticleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.search(query, { category, page }) as {
          data: { results: ArticleSummary[]; total: number }
        };
        setResults(res.data.results);
        setTotal(res.data.total);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, category, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="relative mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for stories, topics, authors..."
          autoFocus
          className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-12 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
        />
      </form>

      {query && (
        <p className="text-sm text-neutral-500 mb-6">
          {loading ? "Searching..." : `${total.toLocaleString()} results for "${query}"`}
        </p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try different keywords</p>
        </div>
      )}
    </div>
  );
}
