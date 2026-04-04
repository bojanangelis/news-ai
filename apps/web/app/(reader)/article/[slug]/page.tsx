import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleMeta } from "@/components/article/article-meta";
import { ArticleActions } from "@/components/article/article-actions";
import { RelatedArticles } from "@/components/article/related-articles";
import { PremiumGate } from "@/components/article/premium-gate";
import { getArticle } from "@/lib/api";
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

  let article: ArticleDetail;
  try {
    const res = await getArticle(slug) as { data: ArticleDetail };
    article = res.data;
  } catch {
    notFound();
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

      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
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

        {/* Meta row */}
        <ArticleMeta article={article} />

        {/* Actions (bookmark, share) — client component */}
        <ArticleActions articleId={article.id} isBookmarked={article.isBookmarked} />

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

        {/* Article body — premium gate wraps the bottom portion */}
        {article.isPremium ? (
          <PremiumGate articleId={article.id}>
            <ArticleBody sections={article.sections} />
          </PremiumGate>
        ) : (
          <ArticleBody sections={article.sections} />
        )}

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

      {/* Related articles */}
      {article.relatedArticles.length > 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 mt-12 pt-12">
          <RelatedArticles articles={article.relatedArticles} />
        </div>
      )}
    </>
  );
}
