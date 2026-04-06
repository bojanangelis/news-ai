"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adsAdminApi } from "@/lib/client-api"
import type {
  AdDetail,
  Advertiser,
  AdCampaign,
  AdType,
  AdPlacement,
  AdDeviceTarget,
} from "@repo/types"
import { AD_TYPE_LABELS, AD_PLACEMENT_LABELS } from "@repo/types"

interface Props {
  ad?: AdDetail
  advertisers: Advertiser[]
  campaigns: AdCampaign[]
}

const AD_TYPES: AdType[] = [
  "POPUP",
  "TOP_BANNER",
  "INLINE_FEED",
  "SIDEBAR",
  "STICKY_BOTTOM",
  "SPONSORED_CARD",
  "FULL_SCREEN_TAKEOVER",
]

const AD_PLACEMENTS: AdPlacement[] = [
  "POPUP",
  "TOP_BANNER",
  "SIDEBAR_RIGHT",
  "FEED_INLINE",
  "STICKY_BOTTOM",
  "ARTICLE_INLINE",
  "SPONSORED_CARD",
  "FULL_SCREEN_TAKEOVER",
]

// Reasonable image dimension guidelines per placement
const PLACEMENT_SIZES: Partial<Record<AdPlacement, string>> = {
  TOP_BANNER: "970×90 or 728×90",
  SIDEBAR_RIGHT: "300×250 or 300×600",
  FEED_INLINE: "600×200",
  STICKY_BOTTOM: "320×50 (mobile) / 728×90 (desktop)",
  POPUP: "600×400 recommended",
  ARTICLE_INLINE: "600×200",
  SPONSORED_CARD: "400×300",
  FULL_SCREEN_TAKEOVER: "1920×1080 or full viewport",
}

export function AdForm({ ad, advertisers, campaigns }: Props) {
  const router = useRouter()
  const isEdit = Boolean(ad)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState(ad?.title ?? "")
  const [advertiserId, setAdvertiserId] = useState(ad?.advertiser.id ?? "")
  const [campaignId, setCampaignId] = useState(ad?.campaign?.id ?? "")
  const [imageUrl, setImageUrl] = useState(ad?.imageUrl ?? "")
  const [videoUrl, setVideoUrl] = useState(ad?.videoUrl ?? "")
  const [altText, setAltText] = useState(ad?.altText ?? "")
  const [type, setType] = useState<AdType>(ad?.type ?? "TOP_BANNER")
  const [placement, setPlacement] = useState<AdPlacement>(
    ad?.placement ?? "TOP_BANNER",
  )
  const [deviceTarget, setDeviceTarget] = useState<AdDeviceTarget>(
    ad?.deviceTarget ?? "ALL",
  )
  const [categoryTargets, setCategoryTargets] = useState(
    ad?.categoryTargets.join(", ") ?? "",
  )
  const [pageTargets, setPageTargets] = useState(
    ad?.pageTargets.join(", ") ?? "",
  )
  const [destinationUrl, setDestinationUrl] = useState(ad?.destinationUrl ?? "")
  const [trackingUrl, setTrackingUrl] = useState(ad?.trackingUrl ?? "")
  const [utmSource, setUtmSource] = useState(ad?.utmSource ?? "")
  const [utmMedium, setUtmMedium] = useState(ad?.utmMedium ?? "")
  const [utmCampaign, setUtmCampaign] = useState(ad?.utmCampaign ?? "")
  const [startDate, setStartDate] = useState(
    ad ? ad.startDate.slice(0, 10) : "",
  )
  const [endDate, setEndDate] = useState(ad ? ad.endDate.slice(0, 10) : "")
  const [totalDays, setTotalDays] = useState(String(ad?.totalDays ?? ""))
  const [popupDelaySec, setPopupDelaySec] = useState(
    String(ad?.popupDelaySec ?? "0"),
  )
  const [popupHomepageOnly, setPopupHomepageOnly] = useState(
    ad?.popupHomepageOnly ?? false,
  )
  const [priority, setPriority] = useState(String(ad?.priority ?? "5"))
  const [weight, setWeight] = useState(String(ad?.weight ?? "100"))
  const [maxImpressionsPerDay, setMaxImpressionsPerDay] = useState(
    String(ad?.maxImpressionsPerDay ?? ""),
  )
  const [maxTotalImpressions, setMaxTotalImpressions] = useState(
    String(ad?.maxTotalImpressions ?? ""),
  )
  const [maxClicks, setMaxClicks] = useState(String(ad?.maxClicks ?? ""))

  const filteredCampaigns = campaigns?.filter(
    (c) => !advertiserId || c.advertiserId === advertiserId,
  )

  function buildPayload() {
    return {
      title,
      advertiserId,
      campaignId: campaignId || undefined,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      altText: altText || undefined,
      type,
      placement,
      deviceTarget,
      categoryTargets:
        categoryTargets ?
          categoryTargets
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      pageTargets:
        pageTargets ?
          pageTargets
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      destinationUrl,
      trackingUrl: trackingUrl || undefined,
      utmSource: utmSource || undefined,
      utmMedium: utmMedium || undefined,
      utmCampaign: utmCampaign || undefined,
      startDate,
      endDate,
      totalDays: totalDays ? parseInt(totalDays) : undefined,
      popupDelaySec: parseInt(popupDelaySec) || 0,
      popupHomepageOnly,
      priority: parseInt(priority) || 5,
      weight: parseInt(weight) || 100,
      maxImpressionsPerDay:
        maxImpressionsPerDay ? parseInt(maxImpressionsPerDay) : undefined,
      maxTotalImpressions:
        maxTotalImpressions ? parseInt(maxTotalImpressions) : undefined,
      maxClicks: maxClicks ? parseInt(maxClicks) : undefined,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit && ad) {
        await adsAdminApi.update(ad.id, buildPayload())
      } else {
        await adsAdminApi.create(buildPayload())
      }
      router.push("/ads")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save ad")
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
  const labelCls =
    "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
  const sectionCls =
    "rounded-2xl border border-neutral-100 dark:border-neutral-800 p-6 space-y-4"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Basic Info ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Basic Info
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Internal Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Telekom Summer Banner June 2026"
              className={inputCls}
            />
            <p className="text-xs text-neutral-400 mt-1">
              Used only in admin — not shown to readers.
            </p>
          </div>

          <div>
            <label className={labelCls}>Advertiser *</label>
            <select
              required
              value={advertiserId}
              onChange={(e) => {
                setAdvertiserId(e.target.value)
                setCampaignId("")
              }}
              className={inputCls}
            >
              <option value="">Select advertiser…</option>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Campaign (optional)</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className={inputCls}
            >
              <option value="">No campaign</option>
              {filteredCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Format & Placement ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Format & Placement
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Ad Type *</label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value as AdType)}
              className={inputCls}
            >
              {AD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {AD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Placement *</label>
            <select
              required
              value={placement}
              onChange={(e) => setPlacement(e.target.value as AdPlacement)}
              className={inputCls}
            >
              {AD_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {AD_PLACEMENT_LABELS[p]}
                </option>
              ))}
            </select>
            {PLACEMENT_SIZES[placement] && (
              <p className="text-xs text-neutral-400 mt-1">
                Recommended size: {PLACEMENT_SIZES[placement]}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Device Target</label>
            <select
              value={deviceTarget}
              onChange={(e) =>
                setDeviceTarget(e.target.value as AdDeviceTarget)
              }
              className={inputCls}
            >
              <option value="ALL">All Devices</option>
              <option value="DESKTOP">Desktop Only</option>
              <option value="MOBILE">Mobile Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Creative ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Creative
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Image URL</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Video URL (optional)</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Alt Text / Accessibility Label</label>
            <input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the ad for screen readers"
              className={inputCls}
            />
          </div>
        </div>

        {imageUrl && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="text-sm text-accent hover:underline"
            >
              {previewOpen ? "Hide Preview" : "Show Preview"}
            </button>
            {previewOpen && (
              <div className="mt-2 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 max-w-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={altText || "Ad preview"}
                  className="w-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Destination & Tracking ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Destination & Tracking
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Destination URL *</label>
            <input
              required
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://advertiser.com/landing-page"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              3rd-Party Tracking URL (optional)
            </label>
            <input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://track.example.com/imp?id=…"
              className={inputCls}
            />
            <p className="text-xs text-neutral-400 mt-1">
              Pinged on impression (GET request, fire-and-forget).
            </p>
          </div>
        </div>

        <div>
          <p className={labelCls}>UTM Parameters (optional)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                utm_source
              </label>
              <input
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="newsplus"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                utm_medium
              </label>
              <input
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                placeholder="display"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                utm_campaign
              </label>
              <input
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="summer-2026"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Scheduling ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Scheduling
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Start Date *</label>
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Date *</label>
            <input
              required
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Planned Run Days (info only)</label>
            <input
              type="number"
              min={1}
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              placeholder="e.g. 30"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Targeting ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Targeting
        </h2>
        <p className="text-sm text-neutral-500">
          Leave blank to target all users. Comma-separated values.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category Slugs</label>
            <input
              value={categoryTargets}
              onChange={(e) => setCategoryTargets(e.target.value)}
              placeholder="sport, politika, ekonomija"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Page Path Prefixes</label>
            <input
              value={pageTargets}
              onChange={(e) => setPageTargets(e.target.value)}
              placeholder="/, /category/sport, /article"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Popup Config (only if POPUP type) ── */}
      {type === "POPUP" && (
        <div className={sectionCls}>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Popup Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Delay before showing (seconds)</label>
              <input
                type="number"
                min={0}
                value={popupDelaySec}
                onChange={(e) => setPopupDelaySec(e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-neutral-400 mt-1">
                0 = show immediately on page load.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="popupHomepageOnly"
                checked={popupHomepageOnly}
                onChange={(e) => setPopupHomepageOnly(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent"
              />
              <label
                htmlFor="popupHomepageOnly"
                className="text-sm text-neutral-700 dark:text-neutral-300"
              >
                Show only on homepage
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Rotation & Limits ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Rotation & Limits
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Priority (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-neutral-400 mt-1">
              Higher = shown more often.
            </p>
          </div>
          <div>
            <label className={labelCls}>Weight</label>
            <input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Impressions / Day</label>
            <input
              type="number"
              min={1}
              value={maxImpressionsPerDay}
              onChange={(e) => setMaxImpressionsPerDay(e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Total Impressions</label>
            <input
              type="number"
              min={1}
              value={maxTotalImpressions}
              onChange={(e) => setMaxTotalImpressions(e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Total Clicks</label>
            <input
              type="number"
              min={1}
              value={maxClicks}
              onChange={(e) => setMaxClicks(e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {saving ?
            "Saving…"
          : isEdit ?
            "Save Changes"
          : "Create Ad"}
        </button>
      </div>
    </form>
  )
}
