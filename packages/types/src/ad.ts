// ─── Ad Types ─────────────────────────────────────────────────────────────────

export type AdType =
  | 'POPUP'
  | 'TOP_BANNER'
  | 'INLINE_FEED'
  | 'SIDEBAR'
  | 'STICKY_BOTTOM'
  | 'SPONSORED_CARD'
  | 'FULL_SCREEN_TAKEOVER';

export type AdPlacement =
  | 'POPUP'
  | 'TOP_BANNER'
  | 'SIDEBAR_RIGHT'
  | 'FEED_INLINE'
  | 'STICKY_BOTTOM'
  | 'ARTICLE_INLINE'
  | 'SPONSORED_CARD'
  | 'FULL_SCREEN_TAKEOVER';

export type AdStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'EXPIRED';

export type AdDeviceTarget = 'ALL' | 'DESKTOP' | 'MOBILE';

// ─── Shared interfaces ────────────────────────────────────────────────────────

export interface AdAdvertiser {
  id: string;
  name: string;
}

export interface AdCampaignRef {
  id: string;
  name: string;
}

/** Lean ad shape returned to the public frontend for rendering */
export interface ActiveAd {
  id: string;
  title: string;
  type: AdType;
  placement: AdPlacement;
  deviceTarget: AdDeviceTarget;
  imageUrl: string | null;
  videoUrl: string | null;
  altText: string | null;
  destinationUrl: string;
  /** Fully-composed destination URL with UTM params appended (built by service) */
  clickUrl: string;
  popupDelaySec: number;
  popupHomepageOnly: boolean;
  advertiser: AdAdvertiser;
}

/** Full ad shape used in admin panel */
export interface AdDetail {
  id: string;
  title: string;
  type: AdType;
  placement: AdPlacement;
  deviceTarget: AdDeviceTarget;
  categoryTargets: string[];
  pageTargets: string[];
  imageUrl: string | null;
  videoUrl: string | null;
  altText: string | null;
  destinationUrl: string;
  trackingUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  startDate: string;
  endDate: string;
  totalDays: number | null;
  popupDelaySec: number;
  popupHomepageOnly: boolean;
  priority: number;
  weight: number;
  maxImpressionsPerDay: number | null;
  maxTotalImpressions: number | null;
  maxClicks: number | null;
  status: AdStatus;
  isEnabled: boolean;
  rejectionReason: string | null;
  totalImpressions: number;
  totalClicks: number;
  createdAt: string;
  updatedAt: string;
  advertiser: AdAdvertiser;
  campaign: AdCampaignRef | null;
}

export interface AdSummary {
  id: string;
  title: string;
  type: AdType;
  placement: AdPlacement;
  status: AdStatus;
  isEnabled: boolean;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  totalClicks: number;
  createdAt: string;
  advertiser: AdAdvertiser;
  campaign: AdCampaignRef | null;
}

// ─── Advertiser ───────────────────────────────────────────────────────────────

export interface Advertiser {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { ads: number; campaigns: number };
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface AdCampaign {
  id: string;
  name: string;
  advertiserId: string;
  advertiser: AdAdvertiser;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { ads: number };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface AdDailyStat {
  id: string;
  adId: string;
  date: string;
  impressions: number;
  clicks: number;
}

export interface AdDashboardStats {
  totalAds: number;
  activeAds: number;
  pendingAds: number;
  today: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  topAds: {
    id: string;
    title: string;
    advertiserName: string;
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
  }[];
}

// ─── Constants (useful in both frontend + admin) ──────────────────────────────

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  POPUP: 'Daily Popup',
  TOP_BANNER: 'Top Banner',
  SIDEBAR_RIGHT: 'Sidebar Right',
  FEED_INLINE: 'Feed Inline',
  STICKY_BOTTOM: 'Sticky Bottom',
  ARTICLE_INLINE: 'Article Inline',
  SPONSORED_CARD: 'Sponsored Card',
  FULL_SCREEN_TAKEOVER: 'Full Screen Takeover',
};

export const AD_TYPE_LABELS: Record<AdType, string> = {
  POPUP: 'Popup / Modal',
  TOP_BANNER: 'Top Banner',
  INLINE_FEED: 'Inline Feed Banner',
  SIDEBAR: 'Sidebar',
  STICKY_BOTTOM: 'Sticky Bottom / Mobile',
  SPONSORED_CARD: 'Sponsored Card',
  FULL_SCREEN_TAKEOVER: 'Full-Screen Takeover',
};

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAUSED: 'Paused',
  EXPIRED: 'Expired',
};
