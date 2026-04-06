"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { adsAdminApi } from "@/lib/client-api"
import type { AdSummary, AdStatus, AdPlacement } from "@repo/types"
import { AD_STATUS_LABELS, AD_PLACEMENT_LABELS } from "@repo/types"

interface Props {
  ads: AdSummary[]
  total: number
  totalPages: number
  currentPage: number
}

const STATUS_COLORS: Record<AdStatus, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAUSED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EXPIRED:
    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
}

const ALL_STATUSES: AdStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "EXPIRED",
]
const ALL_PLACEMENTS: AdPlacement[] = [
  "POPUP",
  "TOP_BANNER",
  "SIDEBAR_RIGHT",
  "FEED_INLINE",
  "STICKY_BOTTOM",
  "ARTICLE_INLINE",
  "SPONSORED_CARD",
  "FULL_SCREEN_TAKEOVER",
]

export function AdsTable({ ads = [], total, totalPages, currentPage }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get("status") ?? ""
  const currentPlacement = searchParams.get("placement") ?? ""

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    router.push(`/ads?${sp.toString()}`)
  }

  async function handleApprove(id: string) {
    await adsAdminApi.updateStatus(id, { status: "APPROVED" })
    router.refresh()
  }

  async function handlePause(id: string) {
    await adsAdminApi.updateStatus(id, { status: "PAUSED" })
    router.refresh()
  }

  async function handleToggle(id: string) {
    await adsAdminApi.toggle(id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ad? This cannot be undone.")) return
    await adsAdminApi.delete(id)
    router.refresh()
  }

  function isExpired(endDate: string) {
    return new Date(endDate) < new Date()
  }

  function isLive(ad: AdSummary) {
    return (
      ad.status === "APPROVED" &&
      ad.isEnabled &&
      !isExpired(ad.endDate) &&
      new Date(ad.startDate) <= new Date()
    )
  }

  const ctr = (ad: AdSummary) =>
    ad.totalImpressions > 0 ?
      ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2) + "%"
    : "—"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          <button
            onClick={() => navigate({ status: "", page: "1" })}
            className={[
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              currentStatus === "" ?
                "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            ].join(" ")}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => navigate({ status: s, page: "1" })}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                currentStatus === s ?
                  "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              ].join(" ")}
            >
              {AD_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Placement filter */}
        <select
          value={currentPlacement}
          onChange={(e) => navigate({ placement: e.target.value, page: "1" })}
          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">All Placements</option>
          {ALL_PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {AD_PLACEMENT_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">
                Ad / Advertiser
              </th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">
                Placement
              </th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">
                Schedule
              </th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-neutral-500">
                Impr.
              </th>
              <th className="text-right px-4 py-3 font-medium text-neutral-500">
                Clicks
              </th>
              <th className="text-right px-4 py-3 font-medium text-neutral-500">
                CTR
              </th>
              <th className="text-right px-4 py-3 font-medium text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {ads.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-neutral-400">
                  No ads found.
                </td>
              </tr>
            )}
            {ads?.map((ad) => (
              <tr
                key={ad.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isLive(ad) && (
                      <span
                        className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"
                        title="Live"
                      />
                    )}
                    <div>
                      <Link
                        href={`/ads/${ad.id}`}
                        className="font-medium text-neutral-900 dark:text-neutral-100 hover:text-accent transition-colors line-clamp-1"
                      >
                        {ad.title}
                      </Link>
                      <p className="text-xs text-neutral-400">
                        {ad.advertiser.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 text-xs">
                  {AD_PLACEMENT_LABELS[ad.placement]}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  <div>{new Date(ad.startDate).toLocaleDateString()}</div>
                  <div>→ {new Date(ad.endDate).toLocaleDateString()}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[ad.status]}`}
                  >
                    {AD_STATUS_LABELS[ad.status]}
                  </span>
                  {!ad.isEnabled && ad.status === "APPROVED" && (
                    <span className="ml-1 text-xs text-neutral-400">
                      (disabled)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                  {ad.totalImpressions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                  {ad.totalClicks.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                  {ctr(ad)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {ad.status === "PENDING" && (
                      <button
                        onClick={() => handleApprove(ad.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {ad.status === "APPROVED" && (
                      <button
                        onClick={() => handlePause(ad.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    {(ad.status === "APPROVED" || ad.status === "PAUSED") && (
                      <button
                        onClick={() => handleToggle(ad.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 transition-colors"
                      >
                        {ad.isEnabled ? "Disable" : "Enable"}
                      </button>
                    )}
                    <Link
                      href={`/ads/${ad.id}`}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(ad.id)}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-neutral-500">
            {total.toLocaleString()} total ads
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => navigate({ page: String(p) })}
                className={[
                  "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                  p === currentPage ?
                    "bg-accent text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
