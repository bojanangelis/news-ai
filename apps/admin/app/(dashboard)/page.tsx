import type { Metadata } from "next";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentArticles } from "@/components/dashboard/recent-articles";
import { adminFetch } from "@/lib/api";
import type { AdminDashboardStats } from "@repo/types";

export const metadata: Metadata = { title: "Dashboard" };

export const revalidate = 60;

export default async function DashboardPage() {
  let stats: AdminDashboardStats | null = null;
  try {
    const res = await adminFetch<{ data: AdminDashboardStats }>("/analytics/dashboard");
    stats = res.data;
  } catch {
    // stats unavailable
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <StatsCards stats={stats} />
      <RecentArticles />
    </div>
  );
}
