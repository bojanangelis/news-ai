import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArticleCard } from "@/components/article/article-card";
import { getAuthor, getArticles } from "@/lib/api";
import type { ArticleSummary } from "@repo/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: author } = await getAuthor(slug);
    return {
      title: author.displayName,
      description: author.bio ?? `Articles by ${author.displayName}`,
      openGraph: {
        title: `${author.displayName} | NewsPlus`,
        description: author.bio ?? undefined,
        images: author.avatarUrl ? [{ url: author.avatarUrl }] : [],
      },
    };
  } catch {
    return { title: "Author" };
  }
}

export const revalidate = 600;

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;

  const [authorRes, articlesRes] = await Promise.allSettled([
    getAuthor(slug),
    getArticles({ authorSlug: slug, limit: 20 }),
  ]);

  if (authorRes.status === "rejected") notFound();

  const author = authorRes.value.data;
  const articlesData =
    articlesRes.status === "fulfilled" ? articlesRes.value.data : null;
  const articles = (articlesData?.data ?? []) as ArticleSummary[];
  const total = articlesData?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Author header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 pb-10 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-accent/20 shrink-0">
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt={author.displayName}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-accent">
              {author.displayName[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {author.displayName}
            </h1>
            {author.isVerified && (
              <span title="Verified author" className="text-accent">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            )}
          </div>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {total} {total === 1 ? "article" : "articles"} published
          </p>

          {author.bio && (
            <p className="mt-3 text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
              {author.bio}
            </p>
          )}

          {/* Social links */}
          {(author.twitterUrl || author.linkedInUrl || author.websiteUrl) && (
            <div className="flex items-center gap-4 mt-4">
              {author.twitterUrl && (
                <a
                  href={author.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-500 hover:text-accent transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Twitter / X
                </a>
              )}
              {author.linkedInUrl && (
                <a
                  href={author.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-500 hover:text-accent transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  LinkedIn
                </a>
              )}
              {author.websiteUrl && (
                <a
                  href={author.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-500 hover:text-accent transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Articles grid */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
          Latest articles
        </h2>

        {articles.length === 0 ? (
          <p className="text-neutral-400 text-center py-12">No published articles yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
