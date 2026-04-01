import Link from "next/link";
import { ArticleCard } from "@/components/article/article-card";
import type { ArticleSummary } from "@repo/types";

interface Section {
  id: string;
  title: string | null;
  categorySlug?: string | null;
  items: Array<{ id: string; order: number; article: ArticleSummary }>;
}

export function CategoryRow({ section }: { section: Section }) {
  const articles = section.items.map((i) => i.article);
  if (!articles.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {section.title ?? (articles[0]?.category.name ?? "Latest")}
        </h2>
        {section.categorySlug && (
          <Link
            href={`/category/${section.categorySlug}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
