import type { AdminDashboardStats } from "@repo/types";

interface Props {
  stats: AdminDashboardStats | null;
  variant?: "compact" | "full";
}

interface StatCard {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: string;
  accent?: string;
}

export function StatsCards({ stats, variant = "full" }: Props) {
  if (!stats) {
    const count = variant === "compact" ? 4 : 8;
    return (
      <div className={`grid grid-cols-2 ${variant === "compact" ? "lg:grid-cols-4" : "lg:grid-cols-4"} gap-4`}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const impressions = stats.adImpressionsToday ?? 0;
  const clicks = stats.adClicksToday ?? 0;
  const inReview = stats.articlesInReview ?? 0;
  const drafts = stats.articlesDraft ?? 0;
  const activeAds = stats.activeAdsCount ?? 0;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";

  const allCards: StatCard[] = [
    {
      label: "Published Articles",
      value: (stats.totalArticles ?? 0).toLocaleString(),
      delta: `+${stats.publishedToday ?? 0} today`,
      deltaPositive: true,
      icon: "📰",
    },
    {
      label: "Total Views",
      value: (stats.totalViews ?? 0).toLocaleString(),
      delta: `+${(stats.viewsToday ?? 0).toLocaleString()} today`,
      deltaPositive: true,
      icon: "👁️",
    },
    {
      label: "Registered Users",
      value: (stats.totalUsers ?? 0).toLocaleString(),
      delta: `+${stats.newUsersToday ?? 0} today`,
      deltaPositive: true,
      icon: "👤",
    },
    {
      label: "Premium Subscribers",
      value: (stats.premiumSubscribers ?? 0).toLocaleString(),
      icon: "⭐",
      accent: "text-yellow-600",
    },
    {
      label: "In Review",
      value: inReview.toLocaleString(),
      delta: inReview > 0 ? "Needs attention" : "All clear",
      deltaPositive: inReview === 0,
      icon: "✍️",
    },
    {
      label: "Drafts",
      value: drafts.toLocaleString(),
      icon: "📝",
    },
    {
      label: "Active Ads",
      value: activeAds.toLocaleString(),
      delta: `${impressions.toLocaleString()} impressions today`,
      deltaPositive: true,
      icon: "📢",
    },
    {
      label: "Ad Clicks Today",
      value: clicks.toLocaleString(),
      delta: `${ctr}% CTR`,
      deltaPositive: parseFloat(ctr) > 0,
      icon: "🖱️",
    },
  ];

  const cards = variant === "compact" ? allCards.slice(0, 4) : allCards;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {card.label}
            </p>
            <span className="text-lg">{card.icon}</span>
          </div>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${card.accent ?? ""}`}>
            {card.value}
          </p>
          {card.delta && (
            <p
              className={`mt-1 text-xs font-medium ${
                card.deltaPositive ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {card.delta}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
