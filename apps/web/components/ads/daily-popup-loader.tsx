import type { ActiveAd } from "@repo/types";
import { getActiveAds } from "@/lib/api";
import { DailyPopup } from "./daily-popup";

interface Props {
  currentPath?: string;
}

/**
 * Server component: fetches POPUP ads and passes them to the DailyPopup client component.
 * Place this once in the root layout or homepage layout.
 */
export async function DailyPopupLoader({ currentPath }: Props) {
  let ads: ActiveAd[] = [];

  try {
    const res = await getActiveAds({ placement: "POPUP" });
    ads = (res.data.data ?? []) as ActiveAd[];
  } catch {
    return null;
  }

  if (!ads.length) return null;

  return <DailyPopup ads={ads} currentPath={currentPath} />;
}
