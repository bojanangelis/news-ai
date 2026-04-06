import type { Metadata } from "next";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopArticlesTable } from "@/components/dashboard/top-articles-table";
import { ViewsChart } from "@/components/dashboard/views-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { adminFetch } from "@/lib/api";
import type { AdminDashboardStats } from "@repo/types";

export const metadata: Metadata = { title: "Analytics" };

export const revalidate = 120;

type TopArticleRow = {
  articleId: string;
  views: number;
  article: { id: string; title: string; slug: string; category: { name: string } } | null;
};

export default async function AnalyticsPage() {
  const [statsRes, topRes] = await Promise.allSettled([
    adminFetch<{ data: AdminDashboardStats }>("/analytics/dashboard"),
    adminFetch<{ data: TopArticleRow[] }>("/analytics/top-articles?days=7&limit=20"),
  ]);

  const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;
  const topArticles = topRes.status === "fulfilled" ? topRes.value.data : [];

  if (statsRes.status === "rejected") {
    console.error("[AnalyticsPage] dashboard fetch failed:", statsRes.reason);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* 8-card overview */}
      <StatsCards stats={stats} variant="full" />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ViewsChart data={stats?.viewsLast7Days ?? []} />
        </div>
        <div>
          <CategoryBreakdown data={stats?.categoryBreakdown ?? []} />
        </div>
      </div>

      {/* Top articles */}
      <TopArticlesTable rows={topArticles} />
    </div>
  );
}
