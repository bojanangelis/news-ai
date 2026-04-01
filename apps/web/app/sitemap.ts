import type { MetadataRoute } from "next";
import { getCategories, getArticles } from "@/lib/api";

const BASE_URL = process.env["NEXT_PUBLIC_WEB_URL"] ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categoriesRes, articlesRes] = await Promise.allSettled([
    getCategories(),
    getArticles({ limit: 200 }),
  ]);

  const categories =
    categoriesRes.status === "fulfilled"
      ? (categoriesRes.value as { data: { slug: string }[] }).data
      : [];

  const articles =
    articlesRes.status === "fulfilled"
      ? (articlesRes.value as { data: { slug: string; publishedAt?: string }[] }).data
      : [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/topics`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
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
