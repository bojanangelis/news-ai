import Link from "next/link";
import Image from "next/image";
import type { ArticleSummary } from "@repo/types";

interface Props {
  article: ArticleSummary;
  variant?: "default" | "horizontal" | "minimal";
}

export function ArticleCard({ article, variant = "default" }: Props) {
  const href = article.sourceUrl ?? `/article/${article.slug}`;
  const isExternal = !!article.sourceUrl;
  const linkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  // Use uploaded cover image if available, otherwise fall back to scraped ogImageUrl
  const coverImage =
    article.coverImage ??
    (article.ogImageUrl
      ? { url: article.ogImageUrl, alt: article.title, width: 800, height: 450 }
      : null);

  if (variant === "horizontal") {
    return (
      <Link href={href} {...linkProps} className="group flex gap-4 items-start">
        {coverImage && (
          <div className="shrink-0 overflow-hidden rounded-xl">
            <Image
              src={coverImage.url}
              alt={coverImage.alt}
              width={120}
              height={80}
              className="w-[120px] h-[80px] object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <CategoryLabel category={article.category} />
          <h3 className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 group-hover:text-accent transition-colors leading-snug">
            {article.title}
          </h3>
          <ArticleByline article={article} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      {...linkProps}
      className="group flex flex-col rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-md transition-shadow duration-200"
    >
      {coverImage && (
        <div className="overflow-hidden aspect-[16/9]">
          <Image
            src={coverImage.url}
            alt={coverImage.alt}
            width={coverImage.width}
            height={coverImage.height}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5 gap-2">
        <div className="flex items-center gap-2">
          <CategoryLabel category={article.category} />
          {article.isPremium && <PremiumBadge />}
          {isExternal && (
            <span className="ml-auto shrink-0 text-neutral-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </span>
          )}
        </div>

        <h2 className="font-bold text-lg leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2 group-hover:text-accent transition-colors">
          {article.title}
        </h2>

        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>

        <ArticleByline article={article} className="mt-auto pt-2" />
      </div>
    </Link>
  );
}

function CategoryLabel({ category }: { category: ArticleSummary["category"] }) {
  return (
    <span
      className="text-xs font-semibold uppercase tracking-wider"
      style={{ color: category.color ?? "var(--color-accent)" }}
    >
      {category.name}
    </span>
  );
}

function PremiumBadge() {
  return (
    <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
      Premium
    </span>
  );
}

function ArticleByline({
  article,
  className = "",
}: {
  article: ArticleSummary;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs text-neutral-400 ${className}`}>
      <span className="font-medium text-neutral-600 dark:text-neutral-400">{article.author.name}</span>
      <span>·</span>
      <time dateTime={article.publishedAt}>
        {new Date(article.publishedAt).toLocaleDateString("mk-MK", {
          month: "short",
          day: "numeric",
        })}
      </time>
      <span>·</span>
      <span>{article.readTimeMinutes} min read</span>
    </div>
  );
}
