import Link from "next/link";
import { adminFetch } from "@/lib/api";
import type { ArticleSummary } from "@repo/types";

export async function RecentArticles() {
  let articles: ArticleSummary[] = [];
  try {
    const res = await adminFetch<{ data: ArticleSummary[] }>("/articles?limit=8&status=DRAFT");
    articles = res.data;
  } catch {
    // unavailable
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 className="font-semibold">Recent Drafts</h2>
        <Link href="/articles" className="text-sm text-accent hover:underline">View all</Link>
      </div>
      {articles.length > 0 ? (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {articles?.map((article) => (
            <li key={article.id}>
              <Link href={`/articles/${article.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{article.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{article.category.name} · {article.author.name}</p>
                </div>
                <StatusBadge status="DRAFT" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center py-10 text-neutral-400 text-sm">No drafts</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    ARCHIVED: "bg-neutral-100 text-neutral-400",
  };
  return (
    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colors[status] ?? colors.DRAFT}`}>
      {status.toLowerCase()}
    </span>
  );
}
