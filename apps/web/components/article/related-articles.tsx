import { ArticleCard } from "./article-card";
import type { ArticleSummary } from "@repo/types";

interface Props {
  articles: ArticleSummary[];
}

export function RelatedArticles({ articles }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-bold tracking-tight mb-8">More stories</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {articles?.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
