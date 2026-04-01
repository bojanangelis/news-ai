import Link from "next/link";
import type { ArticleSummary } from "@repo/types";

interface Section {
  id: string;
  title: string | null;
  items: Array<{ id: string; order: number; article: ArticleSummary }>;
}

export function TrendingSection({ section }: { section: Section }) {
  const articles = section.items.map((i) => i.article);
  if (!articles.length) return null;

  return (
    <section className="bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl p-8">
      <h2 className="text-2xl font-bold tracking-tight mb-6">
        {section.title ?? "Trending"}
      </h2>
      <ol className="space-y-5">
        {articles.slice(0, 8).map((article, idx) => (
          <li key={article.id}>
            <Link
              href={`/article/${article.slug}`}
              className="group flex items-start gap-4"
            >
              <span className="shrink-0 text-3xl font-black text-neutral-200 dark:text-neutral-700 w-8 text-right leading-none mt-1">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: article.category.color ?? "#6366f1" }}
                >
                  {article.category.name}
                </span>
                <h3 className="mt-0.5 font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                  {article.title}
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {article.viewCount.toLocaleString()} reads · {article.readTimeMinutes} min
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
