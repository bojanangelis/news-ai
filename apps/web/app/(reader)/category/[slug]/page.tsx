import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/article/article-card";
import { CategoryHeader } from "@/components/feed/category-header";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { getCategory, getArticles } from "@/lib/api";
import { AdSlot } from "@/components/ads";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: category } = await getCategory(slug);
    return {
      title: `${category.name} News`,
      description: category.description ?? `Latest ${category.name} news and stories.`,
      openGraph: { title: `${category.name} | NewsPlus` },
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));

  const [categoryRes, articlesRes] = await Promise.allSettled([
    getCategory(slug),
    getArticles({ category: slug, page, limit: 20 }),
  ]);

  if (categoryRes.status === "rejected") notFound();

  const category = (categoryRes as PromiseFulfilledResult<{ data: { name: string; description: string | null; color: string | null } }>).value.data;
  const { data: articles, total, totalPages } =
    articlesRes.status === "fulfilled"
      ? articlesRes.value.data
      : { data: [], total: 0, totalPages: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Top banner — category-aware */}
      <AdSlot placement="TOP_BANNER" category={slug} page={`/category/${slug}`} className="mb-6" />

      <CategoryHeader category={category} articleCount={total} />

      <div className="mt-10 lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Article grid */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(articles as import("@repo/types").ArticleSummary[])?.map((article, idx) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {/* Feed inline ad after the 6th article slot */}
            {(articles as import("@repo/types").ArticleSummary[])?.length > 5 && (
              <div className="md:col-span-2">
                <AdSlot placement="FEED_INLINE" category={slug} page={`/category/${slug}`} />
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-12">
              <InfiniteFeed
                initialPage={page}
                totalPages={totalPages}
                category={slug}
              />
            </div>
          )}
        </div>

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block space-y-6">
          <AdSlot placement="SIDEBAR_RIGHT" category={slug} page={`/category/${slug}`} />
        </aside>
      </div>
    </div>
  );
}
