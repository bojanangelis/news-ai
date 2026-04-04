import type { Metadata } from "next";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopArticlesTable } from "@/components/dashboard/top-articles-table";
import { adminFetch } from "@/lib/api";
import type { AdminDashboardStats } from "@repo/types";

export const metadata: Metadata = { title: "Analytics" };

export const revalidate = 300;

export default async function AnalyticsPage() {
  const [statsRes, topRes] = await Promise.allSettled([
    adminFetch<{ data: AdminDashboardStats }>("/analytics/dashboard"),
    adminFetch<{ data: { articleId: string; views: number; article: { id: string; title: string; slug: string; category: { name: string } } | null }[] }>("/analytics/top-articles?days=7&limit=20"),
  ]);

  const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;
  const topArticles = topRes.status === "fulfilled" ? topRes.value.data : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <StatsCards stats={stats} />
      <TopArticlesTable rows={topArticles} />
    </div>
  );
}
