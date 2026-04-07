import Link from "next/link";
import { adminFetch } from "@/lib/api";
import type { ArticleSummary } from "@repo/types";

type ArticleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

const STATUS_BADGE: Record<ArticleStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ARCHIVED: "bg-neutral-100 text-neutral-400",
};

export async function RecentArticles() {
  let articles: ArticleSummary[] = [];
  let error: string | null = null;

  try {
    // status=ALL returns articles of any status — ensures the list is never empty
    const res = await adminFetch<{ data: ArticleSummary[] }>("/articles?limit=10&status=ALL");
    articles = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load articles";
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 className="font-semibold">Recent Articles</h2>
        <Link href="/articles" className="text-sm text-accent hover:underline">
          View all
        </Link>
      </div>

      {error ? (
        <p className="text-center py-10 text-red-500 text-sm px-6">{error}</p>
      ) : articles.length > 0 ? (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {articles.map((article) => {
            const status = (article as unknown as { status?: ArticleStatus }).status ?? "PUBLISHED";
            return (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{article.title}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {article.category?.name ?? "—"} · {article.author?.name ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[status] ?? STATUS_BADGE.PUBLISHED}`}
                  >
                    {status.toLowerCase()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-10 text-neutral-400 text-sm">
          <p>No articles yet.</p>
          <Link href="/articles/new" className="mt-2 inline-block text-accent hover:underline text-xs">
            Create your first article →
          </Link>
        </div>
      )}
    </div>
  );
}
