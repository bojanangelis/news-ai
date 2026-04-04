import type { Metadata } from "next";
import { HeroSection } from "@/components/feed/hero-section";
import { FeaturedGrid } from "@/components/feed/featured-grid";
import { CategoryRow } from "@/components/feed/category-row";
import { TrendingSection } from "@/components/feed/trending-section";
import { ArticleCard } from "@/components/article/article-card";
import { WeatherAirWidget } from "@/components/widgets/weather-air-widget";
import { getHomepageSections, getArticles } from "@/lib/api";
import type { ArticleSummary } from "@repo/types";

export const metadata: Metadata = {
  title: "NewsPlus — Денешни вести",
};

export const revalidate = 60;

interface HomepageSectionItem {
  id: string;
  order: number;
  article: ArticleSummary;
}

interface HomepageSection {
  id: string;
  type: "HERO" | "FEATURED_GRID" | "CATEGORY_ROW" | "TRENDING" | "EDITORS_PICK";
  title: string | null;
  items: HomepageSectionItem[];
  categorySlug?: string | null;
}

export default async function HomePage() {
  const [sectionsRes, latestRes] = await Promise.allSettled([
    getHomepageSections(),
    getArticles({ page: 1, limit: 30 }),
  ]);

  const sections: HomepageSection[] =
    sectionsRes.status === "fulfilled"
      ? (sectionsRes.value.data as HomepageSection[]) ?? []
      : [];

  const latestArticles: ArticleSummary[] =
    latestRes.status === "fulfilled"
      ? (latestRes.value.data?.data as ArticleSummary[]) ?? []
      : [];

  const populatedSections = sections.filter((s) => s.items.length > 0);
  const hasSections = populatedSections.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-14">
      {hasSections ? (
        populatedSections.map((section, idx) => {
          const el = (() => {
            switch (section.type) {
              case "HERO":
                return <HeroSection key={section.id} section={section} />;
              case "FEATURED_GRID":
                return <FeaturedGrid key={section.id} section={section} />;
              case "CATEGORY_ROW":
                return <CategoryRow key={section.id} section={section} />;
              case "TRENDING":
                return <TrendingSection key={section.id} section={section} />;
              default:
                return null;
            }
          })();

          return (
            <div key={section.id}>
              {el}
              {/* Weather + air quality widget after the hero section */}
              {idx === 0 && <div className="mt-6"><WeatherAirWidget /></div>}
            </div>
          );
        })
      ) : (
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-6">Најнови вести</h2>
          {latestArticles.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              Сè уште нема објавени написи. Додадете извор за стружење и притиснете „Scrape Now".
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
