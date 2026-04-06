import type { ActiveAd, AdPlacement } from "@repo/types";
import { getActiveAds } from "@/lib/api";
import { AdSlotClient } from "./ad-slot-client";

interface AdSlotProps {
  placement: AdPlacement;
  category?: string;
  page?: string;
  className?: string;
}

/**
 * Server component: fetches active ads for a placement, then renders
 * the client-side AdSlotClient which handles impression tracking + rotation.
 *
 * Usage:
 *   <AdSlot placement="TOP_BANNER" />
 *   <AdSlot placement="FEED_INLINE" category="sport" />
 *   <AdSlot placement="SIDEBAR_RIGHT" />
 */
export async function AdSlot({ placement, category, page, className }: AdSlotProps) {
  let ads: ActiveAd[] = [];

  try {
    const res = await getActiveAds({ placement, category, page });
    ads = (res.data.data ?? []) as ActiveAd[];
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[AdSlot] Failed to load ads for placement "${placement}":`, err);
    }
    return null;
  }

  if (!ads.length) return null;

  return (
    <AdSlotClient
      ads={ads}
      placement={placement}
      className={className}
    />
  );
}
