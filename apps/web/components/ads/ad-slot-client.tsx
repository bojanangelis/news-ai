"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { ActiveAd, AdPlacement } from "@repo/types"
import { AdRenderer } from "./ad-renderer"

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000"

// ─── Dimension map per placement ──────────────────────────────────────────────
const PLACEMENT_STYLES: Record<AdPlacement, string> = {
  TOP_BANNER: "w-full h-[120px] md:h-[160px]",
  SIDEBAR_RIGHT: "w-full aspect-[4/5] max-w-[300px]",
  FEED_INLINE: "w-full h-[250px] md:h-[300px]",
  STICKY_BOTTOM: "w-full h-[60px] md:h-[90px]",
  ARTICLE_INLINE: "w-full h-[250px] md:h-[300px]",
  SPONSORED_CARD: "w-full aspect-[4/3]",
  FULL_SCREEN_TAKEOVER: "fixed inset-0 z-50",
  POPUP: "w-full max-w-[600px] aspect-[3/2]",
}

interface Props {
  ads: ActiveAd[]
  placement: AdPlacement
  className?: string
}

export function AdSlotClient({ ads, placement, className = "" }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const impressionTracked = useRef(false)

  const currentAd = ads[currentIndex]

  // Track impression via IntersectionObserver — only fires when truly visible
  const trackImpression = useCallback(async (adId: string) => {
    if (impressionTracked.current) return
    impressionTracked.current = true

    const sessionId = getOrCreateSessionId()
    const deviceType = getDeviceType()

    try {
      await fetch(`${API_URL}/v1/ads/${adId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "IMPRESSION", sessionId, deviceType }),
        keepalive: true,
      })
    } catch {
      // never block for tracking
    }
  }, [])

  useEffect(() => {
    if (!ref.current || !currentAd) return
    impressionTracked.current = false // reset when ad changes

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          trackImpression(currentAd.id)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [currentAd, trackImpression])

  // Auto-rotate every 10 seconds when there are multiple ads
  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(() => {
      impressionTracked.current = false
      setCurrentIndex((i) => (i + 1) % ads.length)
    }, 10_000)
    return () => clearInterval(timer)
  }, [ads.length])

  if (!currentAd) return null

  const placementStyle = PLACEMENT_STYLES[placement] ?? "w-full"

  return (
    <div
      ref={ref}
      className={`overflow-hidden rounded-xl ${placementStyle} ${className}`}
    >
      <AdRenderer
        key={currentAd.id}
        ad={currentAd}
        className="w-full h-full"
        showLabel
      />
      {ads.length > 1 && (
        <div className="absolute bottom-1.5 right-1.5 flex gap-1">
          {ads?.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ad ${i + 1}`}
              className={[
                "h-1.5 rounded-full transition-all",
                i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/50",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Helpers (duplicated from ad-renderer to keep components independent) ─────

function getOrCreateSessionId(): string {
  const key = "np_sid"
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem(key, sid)
  }
  return sid
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop"
  const ua = navigator.userAgent.toLowerCase()
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile"
  if (/tablet|ipad/.test(ua)) return "tablet"
  return "desktop"
}
