import type { MetadataRoute } from "next";
import { getCategories, getArticles } from "@/lib/api";

const BASE_URL = process.env["NEXT_PUBLIC_WEB_URL"] ?? "http://localhost:3000";

// Crawl all pages of articles for the sitemap
async function getAllArticles() {
  const all: { slug: string; publishedAt?: string }[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    try {
      const res = await getArticles({ page, limit });
      // getArticles returns { data: { data: [], total, totalPages, ... } }
      const payload = res.data as { data: { slug: string; publishedAt?: string }[]; totalPages: number };
      all.push(...payload.data);
      if (page >= payload.totalPages) break;
      page++;
    } catch {
      break;
    }
  }

  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categoriesRes, articles] = await Promise.all([
    getCategories().catch(() => ({ data: [] })),
    getAllArticles(),
  ]);

  const categories = (categoriesRes as { data: { slug: string }[] }).data ?? [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${cat.slug}`,
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/article/${a.slug}`,
    lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...articleRoutes];
}
