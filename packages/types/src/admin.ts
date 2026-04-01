export interface HomepageSectionItem {
  id: string;
  order: number;
  articleId: string;
}

export type HomepageSectionType =
  | "HERO"
  | "FEATURED_GRID"
  | "CATEGORY_ROW"
  | "TRENDING"
  | "EDITORS_PICK";

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title: string | null;
  order: number;
  isActive: boolean;
  categorySlug: string | null;
  items: HomepageSectionItem[];
}

export interface AdminDashboardStats {
  totalArticles: number;
  publishedToday: number;
  totalViews: number;
  viewsToday: number;
  totalUsers: number;
  newUsersToday: number;
  premiumSubscribers: number;
}

export type ScrapingSourceStatus = "PENDING" | "ACTIVE" | "ERROR" | "PAUSED";

export interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  scrapeIntervalMinutes: number;
  lastScrapedAt: string | null;
  status: ScrapingSourceStatus;
  errorMessage: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
