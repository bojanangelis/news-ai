import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleMeta } from "@/components/article/article-meta";
import { ArticleActions } from "@/components/article/article-actions";
import { RelatedArticles } from "@/components/article/related-articles";
import { PremiumGate } from "@/components/article/premium-gate";
import { ArticleIntelligencePanel } from "@/components/article/article-intelligence-panel";
import { ArticleViewTracker } from "@/components/article/article-view-tracker";
import { ArticleSourceRedirect } from "@/components/article/article-source-redirect";
import { getArticle } from "@/lib/api";
import { AdSlot } from "@/components/ads";
import { getSessionFromCookies } from "@/lib/auth";
import type { ArticleDetail } from "@repo/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: article } = await getArticle(slug) as { data: ArticleDetail };
    return {
      title: article.title,
      description: article.excerpt,
      openGraph: {
        title: article.title,
        description: article.excerpt,
        type: "article",
        publishedTime: article.publishedAt,
        authors: [article.author.name],
        images: article.coverImage ? [{ url: article.coverImage.url, width: article.coverImage.width, height: article.coverImage.height, alt: article.coverImage.alt }] : [],
      },
      twitter: { card: "summary_large_image", title: article.title, description: article.excerpt },
    };
  } catch {
    return { title: "Article" };
  }
}

// Articles are statically generated and revalidated every 5 minutes
export const revalidate = 300;

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  const session = await getSessionFromCookies();
  const isPremium = session?.isPremium ?? false;

  let article: ArticleDetail;
  try {
    const res = await getArticle(slug) as { data: ArticleDetail };
    article = res.data;
  } catch {
    notFound();
  }

  // Scraped articles: track the view first, then redirect client-side
  const sourceUrl = (article as unknown as { sourceUrl?: string }).sourceUrl;
  if (sourceUrl) {
    return <ArticleSourceRedirect articleId={article.id} sourceUrl={sourceUrl} />;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: "NewsPlus" },
    image: article.coverImage?.url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* View tracking for non-scraped articles */}
      <ArticleViewTracker articleId={article.id} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className={isPremium && !article.relatedArticles.length ? "" : "lg:grid lg:grid-cols-[1fr_300px] lg:gap-12"}>
          <article className="min-w-0">
            {/* Category + title */}
            <div className="mb-8">
              <a
                href={`/category/${article.category.slug}`}
                className="text-sm font-semibold uppercase tracking-wider text-accent hover:underline"
              >
                {article.category.name}
              </a>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
                {article.title}
              </h1>
              <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {article.excerpt}
              </p>
            </div>

            {/* Cover image */}
            {article.coverImage && (
              <div className="my-8 overflow-hidden rounded-2xl">
                <Image
                  src={article.coverImage.url}
                  alt={article.coverImage.alt}
                  width={article.coverImage.width}
                  height={article.coverImage.height}
                  priority
                  className="w-full object-cover"
                  placeholder={article.coverImage.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={article.coverImage.blurDataUrl}
                />
              </div>
            )}

            {/* AI Intelligence Panel */}
            <ArticleIntelligencePanel articleId={article.id} />

            {/* Article body — premium gate wraps the bottom portion */}
            {article.isPremium ? (
              <PremiumGate articleId={article.id}>
                <ArticleBody sections={article.sections} />
              </PremiumGate>
            ) : (
              <ArticleBody sections={article.sections} />
            )}

            {/* Mid-article ad — hidden for premium */}
            {!isPremium && (
              <AdSlot placement="ARTICLE_INLINE" category={article.category.slug} className="my-8" />
            )}

            {/* Author card — below body content */}
            <ArticleMeta article={article} />

            {/* Actions (bookmark, share) — client component */}
            <ArticleActions articleId={article.id} isBookmarked={article.isBookmarked} />

            {/* Tags */}
            {(() => {
              const tags = (article as unknown as { articleTags?: { tag: { id: string; name: string; slug: string } }[] }).articleTags;
              if (!tags?.length) return null;
              return (
                <div className="mt-8 flex flex-wrap gap-2">
                  {tags.map(({ tag }) => (
                    <a
                      key={tag.id}
                      href={`/search?q=${encodeURIComponent(tag.name)}`}
                      className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:border-accent hover:text-accent transition-colors"
                    >
                      #{tag.name}
                    </a>
                  ))}
                </div>
              );
            })()}
          </article>

          {/* Sidebar — visible on large screens; hidden for premium when empty */}
          {(!isPremium || article.relatedArticles.length > 0) && (
            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-6">
                {/* Sidebar ad — hidden for premium */}
                {!isPremium && (
                  <AdSlot placement="SIDEBAR_RIGHT" category={article.category.slug} />
                )}

                {article.relatedArticles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Related</h3>
                    <div className="space-y-4">
                      {article.relatedArticles.slice(0, 4).map((r) => (
                        <a key={r.id} href={`/article/${r.slug}`} className="block group">
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-accent transition-colors leading-snug line-clamp-3">{r.title}</p>
                          <p className="text-xs text-neutral-400 mt-1">{r.category?.name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* Related articles on mobile */}
        {article.relatedArticles.length > 0 && (
          <div className="lg:hidden border-t border-neutral-100 dark:border-neutral-800 mt-12 pt-12">
            <RelatedArticles articles={article.relatedArticles} />
          </div>
        )}
      </div>
    </>
  );
}
