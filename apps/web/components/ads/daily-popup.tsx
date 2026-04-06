"use client";

import { useState, useEffect, useCallback } from "react";
import type { ActiveAd } from "@repo/types";
import { AdRenderer } from "./ad-renderer";

const POPUP_SEEN_KEY = "np_popup_seen";
const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface Props {
  ads: ActiveAd[];
  currentPath?: string;
}

/**
 * Daily popup modal ad.
 * - Shows once per browser per calendar day (stored in localStorage).
 * - Respects the ad's `popupDelaySec` before appearing.
 * - Respects `popupHomepageOnly` — won't show on non-home pages if set.
 * - Tracks impressions + clicks.
 */
export function DailyPopup({ ads, currentPath = "/" }: Props) {
  const [visible, setVisible] = useState(false);
  const [ad, setAd] = useState<ActiveAd | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    // Mark as seen today
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(POPUP_SEEN_KEY, today);
  }, []);

  useEffect(() => {
    if (!ads.length) return;

    // Pick first eligible ad (homepage-only filtering)
    const isHomepage = currentPath === "/";
    const eligible = ads.find((a) => {
      if (a.popupHomepageOnly && !isHomepage) return false;
      return true;
    });
    if (!eligible) return;

    // Check if already shown today
    const seenDate = localStorage.getItem(POPUP_SEEN_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (seenDate === today) return;

    setAd(eligible);

    const delay = (eligible.popupDelaySec ?? 0) * 1000;
    const timer = setTimeout(() => {
      setVisible(true);
      trackImpression(eligible.id);
    }, delay);

    return () => clearTimeout(timer);
  }, [ads, currentPath]);

  if (!visible || !ad) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Advertisement"
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-[600px] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <AdRenderer
            ad={ad}
            className="w-full"
            onClose={close}
            showLabel
          />
        </div>
      </div>
    </>
  );
}

async function trackImpression(adId: string) {
  const sessionId = getOrCreateSessionId();
  const deviceType = getDeviceType();
  try {
    await fetch(`${API_URL}/v1/ads/${adId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "IMPRESSION", sessionId, deviceType }),
      keepalive: true,
    });
  } catch {
    // silent
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
