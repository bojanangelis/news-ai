"use client";

import { useCallback } from "react";
import type { ActiveAd } from "@repo/types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface AdRendererProps {
  ad: ActiveAd;
  className?: string;
  onClose?: () => void;
  showLabel?: boolean;
}

/**
 * Low-level ad renderer. Handles impression tracking, click tracking,
 * and renders the correct creative (image or video).
 */
export function AdRenderer({ ad, className = "", onClose, showLabel = true }: AdRendererProps) {
  const trackEvent = useCallback(
    async (type: "IMPRESSION" | "CLICK") => {
      const sessionId = getOrCreateSessionId();
      const deviceType = getDeviceType();
      try {
        await fetch(`${API_URL}/v1/ads/${ad.id}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, sessionId, deviceType, referer: window.location.href }),
          keepalive: true,
        });
      } catch {
        // Fire-and-forget — never block UI for tracking
      }
    },
    [ad.id],
  );

  // Track impression once when component mounts
  // Using useEffect inside the component to avoid re-tracking on re-renders
  // NOTE: actual IntersectionObserver is handled in AdSlot wrapper

  function handleClick() {
    trackEvent("CLICK");
  }

  const clickUrl = buildClickUrl(ad);

  return (
    <div className={`relative group ${className}`}>
      {showLabel && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <span className="bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            Реклама
          </span>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close ad"
          className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <a
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block w-full h-full"
        aria-label={ad.altText ?? `Advertisement: ${ad.advertiser.name}`}
      >
        {ad.videoUrl ? (
          <video
            src={ad.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.imageUrl}
            alt={ad.altText ?? `Advertisement by ${ad.advertiser.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          // Text fallback for sponsored card type
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-sm p-4 text-center">
            {ad.advertiser.name}
          </div>
        )}
      </a>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildClickUrl(ad: ActiveAd): string {
  try {
    const url = new URL(ad.destinationUrl);
    // Append UTM params if they exist on the ad object (API may or may not send them)
    const utm = ad as unknown as Record<string, string | null>;
    if (utm["utmSource"]) url.searchParams.set("utm_source", utm["utmSource"]);
    if (utm["utmMedium"]) url.searchParams.set("utm_medium", utm["utmMedium"]);
    if (utm["utmCampaign"]) url.searchParams.set("utm_campaign", utm["utmCampaign"]);
    return url.toString();
  } catch {
    return ad.destinationUrl;
  }
}

function getOrCreateSessionId(): string {
  const key = "np_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile";
  if (/tablet|ipad/.test(ua)) return "tablet";
  return "desktop";
}
