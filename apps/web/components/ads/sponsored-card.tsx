import type { ActiveAd } from "@repo/types";
import { getActiveAds } from "@/lib/api";
import { getSessionFromCookies } from "@/lib/auth";
import { AdRenderer } from "./ad-renderer";

/**
 * Server component: renders a sponsored card inline in the article feed.
 * Looks like a news card but is clearly labeled "Спонзорирано".
 */
export async function SponsoredCard({ category }: { category?: string }) {
  const session = await getSessionFromCookies();
  if (session?.isPremium) return null;

  let ad: ActiveAd | null = null;

  try {
    const res = await getActiveAds({ placement: "SPONSORED_CARD", category });
    ad = ((res.data.data ?? []) as ActiveAd[])[0] ?? null;
  } catch {
    return null;
  }

  if (!ad) return null;

  return (
    <article className="relative rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="absolute top-2 right-2 z-10">
        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
          Спонзорирано
        </span>
      </div>
      <AdRenderer
        ad={ad}
        className="w-full aspect-[4/3]"
        showLabel={false}
      />
      <div className="p-3">
        <p className="text-xs text-neutral-400">{ad.advertiser.name}</p>
      </div>
    </article>
  );
}
