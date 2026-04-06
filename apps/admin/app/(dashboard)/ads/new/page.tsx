import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import { AdForm } from "@/components/ads/ad-form";
import type { Advertiser, AdCampaign } from "@repo/types";

export const metadata: Metadata = { title: "New Advertisement" };

export default async function NewAdPage() {
  let advertisers: Advertiser[] = [];
  let campaigns: AdCampaign[] = [];

  try {
    const [advRes, campRes] = await Promise.all([
      adminFetch<{ data: { data: Advertiser[] } }>("/admin/ads/advertisers"),
      adminFetch<{ data: { data: AdCampaign[] } }>("/admin/ads/campaigns"),
    ]);
    advertisers = advRes.data.data ?? [];
    campaigns = campRes.data.data ?? [];
  } catch {
    // graceful degradation
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Advertisement</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Create a new ad. It will be saved as <strong>Pending</strong> until you approve it.
        </p>
      </div>

      <AdForm advertisers={advertisers} campaigns={campaigns} />
    </div>
  );
}
