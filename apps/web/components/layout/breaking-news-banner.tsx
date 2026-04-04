import Link from "next/link";
import { getArticles } from "@/lib/api";
import type { ArticleSummary } from "@repo/types";

export async function BreakingNewsBanner() {
  let articles: ArticleSummary[] = [];

  try {
    const res = await getArticles({ isBreaking: true, limit: 5 });
    articles = (res.data?.data ?? []) as ArticleSummary[];
  } catch {
    return null;
  }

  if (articles.length === 0) return null;

  return (
    <div className="bg-red-600 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-2 overflow-hidden">
          {/* Label */}
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-sm bg-white text-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            Breaking
          </span>

          {/* Scrolling ticker if multiple, static if one */}
          {articles.length === 1 ? (
            <Link
              href={`/article/${articles[0]!.slug}`}
              className="text-sm font-medium hover:underline truncate"
            >
              {articles[0]!.title}
            </Link>
          ) : (
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-none whitespace-nowrap">
              {articles.map((article, i) => (
                <span key={article.id} className="flex items-center gap-6 shrink-0">
                  {i > 0 && <span className="text-red-300 text-xs">•</span>}
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {article.title}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
