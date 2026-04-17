import type { ActiveAd } from "@repo/types";
import { getActiveAds } from "@/lib/api";
import { getSessionFromCookies } from "@/lib/auth";
import { StickyBottomAd } from "./sticky-bottom-ad";

/**
 * Server component: fetches STICKY_BOTTOM ads and renders the sticky banner.
 * Place once in the layout so it appears on all reader pages.
 */
export async function StickyBottomLoader() {
  // Premium users see no ads
  const session = await getSessionFromCookies();
  if (session?.isPremium) return null;

  let ads: ActiveAd[] = [];

  try {
    const res = await getActiveAds({ placement: "STICKY_BOTTOM" });
    ads = (res.data.data ?? []) as ActiveAd[];
  } catch {
    return null;
  }

  if (!ads.length) return null;

  // Pick the first active ad (highest priority/weight, sorted by the API)
  return <StickyBottomAd ad={ads[0]!} />;
}
