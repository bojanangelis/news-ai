"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { articlesAdminApi } from "@/lib/client-api";
import type { ArticleSummary } from "@repo/types";

interface Props {
  articles: ArticleSummary[];
  total: number;
  totalPages: number;
  currentPage: number;
}

const STATUS_TABS = ["", "DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"];

export function ArticlesTable({ articles = [], total, totalPages, currentPage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/articles?${sp.toString()}`);
  }

  async function publish(id: string) {
    await articlesAdminApi.publish(id);
    router.refresh();
  }

  async function archive(id: string) {
    await articlesAdminApi.archive(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => navigate({ status: s, page: "1" })}
            className={[
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              currentStatus === s
                ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            ].join(" ")}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              {["Title", "Category", "Author", "Status", "Published", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {articles.length > 0 && articles.map((article) => (
              <tr key={article.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/20">
                <td className="px-4 py-3 max-w-[280px]">
                  <Link href={`/articles/${article.id}`} className="font-medium hover:text-accent transition-colors line-clamp-1">
                    {article.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-500">{article.category.name}</td>
                <td className="px-4 py-3 text-neutral-500">{article.author.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={"DRAFT"} />
                </td>
                <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/articles/${article.id}`} className="text-xs text-accent hover:underline">Edit</Link>
                    <button onClick={() => publish(article.id)} className="text-xs text-emerald-600 hover:underline">Publish</button>
                    <button onClick={() => archive(article.id)} className="text-xs text-neutral-400 hover:underline">Archive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {articles.length === 0 && (
          <p className="text-center py-12 text-neutral-400">No articles found</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">{total.toLocaleString()} articles</p>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => navigate({ page: String(currentPage - 1) })}
              className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              ← Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-neutral-500">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => navigate({ page: String(currentPage + 1) })}
              className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    REVIEW: "bg-amber-100 text-amber-700",
    PUBLISHED: "bg-emerald-100 text-emerald-700",
    ARCHIVED: "bg-neutral-100 text-neutral-400",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colors[status] ?? colors.DRAFT}`}>
      {status.toLowerCase()}
    </span>
  );
}
