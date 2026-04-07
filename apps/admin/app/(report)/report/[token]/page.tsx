import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PublicAdReport, AdPlacement } from "@repo/types";

export const metadata: Metadata = { title: "Campaign Report | NewsPlus" };
export const revalidate = 300;

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  TOP_BANNER: "Top Banner",
  FEED_INLINE: "Feed Inline",
  POPUP: "Daily Popup",
  SIDEBAR_RIGHT: "Sidebar",
  STICKY_BOTTOM: "Sticky Bottom",
  ARTICLE_INLINE: "Article Inline",
  SPONSORED_CARD: "Sponsored Card",
  FULL_SCREEN_TAKEOVER: "Full-Screen Takeover",
};

async function fetchReport(token: string): Promise<PublicAdReport | null> {
  try {
    const res = await fetch(`${API_URL}/v1/ads/report/${token}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as PublicAdReport;
  } catch {
    return null;
  }
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await fetchReport(token);
  if (!report) notFound();

  const maxViews = Math.max(...report.daily.map((d) => d.impressions), 1);
  const isActive = report.status === "APPROVED";
  const now = new Date();
  const end = new Date(report.endDate);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                NewsPlus · Campaign Report
              </p>
              <h1 className="text-xl font-bold">{report.advertiserName}</h1>
              {report.campaignName && (
                <p className="text-sm text-neutral-500 mt-0.5">{report.campaignName}</p>
              )}
            </div>
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {isActive ? "Active" : report.status.toLowerCase()}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-neutral-400">Placement</p>
              <p className="font-medium mt-0.5">{PLACEMENT_LABELS[report.placement] ?? report.placement}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Start</p>
              <p className="font-medium mt-0.5">{new Date(report.startDate).toLocaleDateString("en-GB")}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">End</p>
              <p className="font-medium mt-0.5">{new Date(report.endDate).toLocaleDateString("en-GB")}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Days Left</p>
              <p className="font-medium mt-0.5">{isActive ? daysLeft : "—"}</p>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Impressions", value: report.totals.impressions.toLocaleString() },
            { label: "Total Clicks", value: report.totals.clicks.toLocaleString() },
            { label: "CTR", value: `${report.ctr}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-neutral-200 p-5 text-center">
              <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
              <p className="text-xs text-neutral-400 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Daily impressions chart */}
        {report.daily.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-semibold mb-6">Daily Impressions</h2>
            <div className="flex items-end gap-1.5 h-32">
              {report.daily.map((d) => {
                const pct = Math.round((d.impressions / maxViews) * 100);
                return (
                  <div key={String(d.date)} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-neutral-400 tabular-nums">
                      {d.impressions > 0 ? d.impressions : ""}
                    </span>
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t bg-blue-500/70"
                        style={{ height: `${Math.max(pct, d.impressions > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-neutral-400">
                      {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Daily breakdown table */}
        {report.daily.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold">Daily Breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  {["Date", "Impressions", "Clicks", "CTR"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {[...report.daily].reverse().map((d) => {
                  const dayCtr = d.impressions > 0
                    ? ((d.clicks / d.impressions) * 100).toFixed(2)
                    : "0.00";
                  return (
                    <tr key={String(d.date)} className="hover:bg-neutral-50">
                      <td className="px-6 py-3 text-neutral-600">
                        {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3 tabular-nums font-medium">{d.impressions.toLocaleString()}</td>
                      <td className="px-6 py-3 tabular-nums">{d.clicks.toLocaleString()}</td>
                      <td className="px-6 py-3 tabular-nums text-neutral-500">{dayCtr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-neutral-400 pb-4">
          Generated by NewsPlus · Data refreshes every 5 minutes ·{" "}
          {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
