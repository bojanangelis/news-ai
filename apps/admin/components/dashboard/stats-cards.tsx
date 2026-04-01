import type { AdminDashboardStats } from "@repo/types";

interface Props {
  stats: AdminDashboardStats | null;
}

interface StatCard {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}

export function StatsCards({ stats }: Props) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const cards: StatCard[] = [
    { label: "Total Articles", value: stats?.totalArticles?.toLocaleString(), delta: `+${stats?.publishedToday} today`, positive: true },
    { label: "Views Today", value: stats?.viewsToday?.toLocaleString(), delta: `${stats?.totalViews?.toLocaleString()} total`, positive: true },
    { label: "Total Users", value: stats?.totalUsers?.toLocaleString(), delta: `+${stats?.newUsersToday} today`, positive: true },
    { label: "Premium Subs", value: stats?.premiumSubscribers?.toLocaleString(), positive: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{card.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{card.value}</p>
          {card.delta && (
            <p className={`mt-1 text-xs font-medium ${card.positive ? "text-emerald-600" : "text-red-600"}`}>
              {card.delta}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
