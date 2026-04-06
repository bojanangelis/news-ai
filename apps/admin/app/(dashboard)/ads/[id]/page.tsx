"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adsAdminApi } from "@/lib/client-api";
import { AdForm } from "@/components/ads/ad-form";
import type {
  AdDetail, Advertiser, AdCampaign, AdDailyStat, AdStatus,
} from "@repo/types";
import { AD_STATUS_LABELS, AD_PLACEMENT_LABELS } from "@repo/types";

const STATUS_COLORS: Record<AdStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PAUSED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-neutral-100 text-neutral-500",
};

export default function AdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ad, setAd] = useState<AdDetail | null>(null);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [stats, setStats] = useState<{ daily: AdDailyStat[]; totals: { impressions: number; clicks: number }; ctr: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"edit" | "stats">("edit");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [adRes, advRes, campRes, statsRes] = await Promise.all([
          adsAdminApi.get(id) as Promise<{ data: { data: AdDetail } }>,
          adsAdminApi.listAdvertisers() as Promise<{ data: { data: Advertiser[] } }>,
          adsAdminApi.listCampaigns() as Promise<{ data: { data: AdCampaign[] } }>,
          adsAdminApi.getStats(id) as Promise<{ data: { data: typeof stats } }>,
        ]);
        setAd(adRes.data.data);
        setAdvertisers(advRes.data.data ?? []);
        setCampaigns(campRes.data.data ?? []);
        setStats(statsRes.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleStatusChange(status: "APPROVED" | "REJECTED" | "PAUSED") {
    setUpdatingStatus(true);
    try {
      await adsAdminApi.updateStatus(id, { status, rejectionReason: statusNote || undefined });
      const res = await adsAdminApi.get(id) as { data: { data: AdDetail } };
      setAd(res.data.data);
      setStatusNote("");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleToggle() {
    await adsAdminApi.toggle(id);
    const res = await adsAdminApi.get(id) as { data: { data: AdDetail } };
    setAd(res.data.data);
  }

  if (loading) {
    return <div className="py-12 text-center text-neutral-400">Loading…</div>;
  }
  if (!ad) {
    return <div className="py-12 text-center text-neutral-400">Ad not found.</div>;
  }

  const ctr = ad.totalImpressions > 0
    ? ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/ads" className="text-sm text-neutral-400 hover:text-accent transition-colors">
              ← Ads
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{ad.title}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {ad.advertiser.name} · {AD_PLACEMENT_LABELS[ad.placement]}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[ad.status]}`}>
            {AD_STATUS_LABELS[ad.status]}
          </span>
          {(ad.status === "APPROVED" || ad.status === "PAUSED") && (
            <button
              onClick={handleToggle}
              className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 transition-colors"
            >
              {ad.isEnabled ? "Disable" : "Enable"}
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4">
          <p className="text-xs text-neutral-500">Total Impressions</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{ad.totalImpressions.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4">
          <p className="text-xs text-neutral-500">Total Clicks</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{ad.totalClicks.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4">
          <p className="text-xs text-neutral-500">CTR</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{ctr}%</p>
        </div>
      </div>

      {/* Approval workflow */}
      {ad.status === "PENDING" && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-5 space-y-3">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400">Approval Required</h3>
          <p className="text-sm text-amber-700 dark:text-amber-500">Review this ad and approve or reject it below.</p>
          <div>
            <label className="block text-xs text-amber-700 dark:text-amber-400 mb-1">Rejection reason (optional)</label>
            <input
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Leave blank if approving"
              className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusChange("APPROVED")}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              Approve
            </button>
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusChange("REJECTED")}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              Reject
            </button>
          </div>
          {ad.rejectionReason && (
            <p className="text-sm text-red-600">Rejection note: {ad.rejectionReason}</p>
          )}
        </div>
      )}

      {ad.status === "APPROVED" && (
        <div className="flex justify-end">
          <button
            onClick={() => handleStatusChange("PAUSED")}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Pause Ad
          </button>
        </div>
      )}

      {ad.status === "PAUSED" && (
        <div className="flex justify-end">
          <button
            onClick={() => handleStatusChange("APPROVED")}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
          >
            Resume Ad
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {(["edit", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
              tab === t
                ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "edit" && (
        <AdForm ad={ad} advertisers={advertisers} campaigns={campaigns} />
      )}

      {tab === "stats" && stats && (
        <div className="space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Daily Performance</h2>
          {stats.daily.length === 0 ? (
            <p className="text-neutral-400 text-sm">No stats recorded yet.</p>
          ) : (
            <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-neutral-500">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-neutral-500">Impressions</th>
                    <th className="text-right px-4 py-3 font-medium text-neutral-500">Clicks</th>
                    <th className="text-right px-4 py-3 font-medium text-neutral-500">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {stats.daily.map((row) => {
                    const rowCtr = row.impressions > 0
                      ? ((row.clicks / row.impressions) * 100).toFixed(2)
                      : "0.00";
                    return (
                      <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                          {rowCtr}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">Total</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{stats.totals.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{stats.totals.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{stats.ctr}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
