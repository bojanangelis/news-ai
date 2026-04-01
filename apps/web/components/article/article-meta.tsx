import Image from "next/image";
import Link from "next/link";
import type { ArticleDetail } from "@repo/types";

interface Props {
  article: ArticleDetail;
}

export function ArticleMeta({ article }: Props) {
  return (
    <div className="flex items-center gap-4 py-4 border-y border-neutral-100 dark:border-neutral-800 mb-6">
      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-accent/20 shrink-0">
        {article.author.avatarUrl ? (
          <Image
            src={article.author.avatarUrl}
            alt={article.author.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-accent font-semibold">
            {article.author.name[0]}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/author/${article.author.slug}`}
          className="text-sm font-semibold hover:text-accent transition-colors"
        >
          {article.author.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>·</span>
          <span>{article.readTimeMinutes} min read</span>
          <span>·</span>
          <span>{article.viewCount.toLocaleString()} views</span>
        </div>
      </div>
    </div>
  );
}
