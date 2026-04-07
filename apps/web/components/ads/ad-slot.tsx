import type { ActiveAd, AdPlacement } from "@repo/types";
import { getActiveAds } from "@/lib/api";
import { getSessionFromCookies } from "@/lib/auth";
import { AdSlotClient } from "./ad-slot-client";

interface AdSlotProps {
  placement: AdPlacement;
  category?: string;
  page?: string;
  className?: string;
}

export async function AdSlot({ placement, category, page, className }: AdSlotProps) {
  // Premium users see no ads
  const session = await getSessionFromCookies();
  if (session?.isPremium) return null;

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

  return <AdSlotClient ads={ads} placement={placement} className={className} />;
}
