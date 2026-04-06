import type { Metadata } from "next"
import Link from "next/link"
import { adminFetch } from "@/lib/api"
import { AdsTable } from "@/components/ads/ads-table"
import type { AdSummary, AdDashboardStats } from "@repo/types"

export const metadata: Metadata = { title: "Advertisements" }

interface Props {
  searchParams: Promise<{
    page?: string
    status?: string
    placement?: string
    q?: string
  }>
}

export default async function AdsPage({ searchParams }: Props) {
  const { page = "1", status, placement, q } = await searchParams

  const qs = new URLSearchParams({
    page,
    limit: "25",
    ...(status && { status }),
    ...(placement && { placement }),
    ...(q && { q }),
  }).toString()

  let ads: AdSummary[] = []
  let total = 0
  let totalPages = 0
  let dashboard: AdDashboardStats | null = null

  try {
    const [adsRes, dashRes] = await Promise.all([
      adminFetch<{ data: { data: AdSummary[]; total: number; totalPages: number } }>(
        `/admin/ads?${qs}`,
      ),
      adminFetch<{ data: { data: AdDashboardStats } }>(`/admin/ads/dashboard`),
    ])
    ads = adsRes.data.data ?? []
    total = adsRes.data.total ?? 0
    totalPages = adsRes.data.totalPages ?? 0
    dashboard = dashRes.data.data ?? null
  } catch {
    // graceful degradation
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advertisements</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {total.toLocaleString()} total ads
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ads/advertisers"
            className="inline-flex h-10 items-center rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Advertisers
          </Link>
          <Link
            href="/ads/new"
            className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Ad
          </Link>
        </div>
      </div>

      {/* Dashboard stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Live Now" value={dashboard.activeAds} accent />
          <StatCard
            label="Pending Review"
            value={dashboard.pendingAds}
            warn={dashboard.pendingAds > 0}
          />
          <StatCard
            label="Today Impressions"
            value={dashboard?.today?.impressions?.toLocaleString()}
          />
          <StatCard label="Today CTR" value={`${dashboard?.today?.ctr}%`} />
        </div>
      )}

      <AdsTable
        ads={ads}
        total={total}
        totalPages={totalPages}
        currentPage={parseInt(page, 10)}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  warn,
}: {
  label: string
  value: string | number
  accent?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5",
        accent ? "border-accent/20 bg-accent/5"
        : warn ?
          "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10"
        : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900",
      ].join(" ")}
    >
      <p className="text-sm text-neutral-500">{label}</p>
      <p
        className={[
          "text-2xl font-bold mt-1",
          accent ? "text-accent"
          : warn ? "text-amber-600 dark:text-amber-400"
          : "text-neutral-900 dark:text-neutral-100",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  )
}
