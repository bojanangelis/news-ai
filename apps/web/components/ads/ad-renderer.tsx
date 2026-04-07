"use client";

import type { ActiveAd } from "@repo/types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface AdRendererProps {
  ad: ActiveAd;
  className?: string;
  onClose?: () => void;
  showLabel?: boolean;
}

/**
 * Renders a single ad creative.
 * - Clicks go through the server-side redirect endpoint which records the click
 *   and issues a 302 to the destination URL (with UTM params added server-side).
 * - Impressions are tracked by the parent AdSlotClient via IntersectionObserver.
 */
export function AdRenderer({ ad, className = "", onClose, showLabel = true }: AdRendererProps) {
  // Server-side redirect: records click + redirects to destination with UTM params
  const clickUrl = `${API_URL}/v1/ads/${ad.id}/redirect`;

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
          className="absolute top-1.5 right-1.5 z-10 h-11 w-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <a
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block w-full h-full"
        aria-label={ad.altText ?? `Реклама: ${ad.advertiser.name}`}
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
            alt={ad.altText ?? `Реклама — ${ad.advertiser.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-sm p-4 text-center">
            {ad.advertiser.name}
          </div>
        )}
      </a>
    </div>
  );
}

// ─── Session / device helpers (used by AdSlotClient) ────────────────────────

export function getOrCreateSessionId(): string {
  const key = "np_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile";
  if (/tablet|ipad/.test(ua)) return "tablet";
  return "desktop";
}
