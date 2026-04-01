import { ArticleCard } from "@/components/article/article-card";
import type { ArticleSummary } from "@repo/types";

interface Section {
  id: string;
  title: string | null;
  items: Array<{ id: string; order: number; article: ArticleSummary }>;
}

export function FeaturedGrid({ section }: { section: Section }) {
  const articles = section.items.map((i) => i.article);
  if (!articles.length) return null;

  return (
    <section>
      {section.title && (
        <h2 className="text-2xl font-bold tracking-tight mb-6">{section.title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
