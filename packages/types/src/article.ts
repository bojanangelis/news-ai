import { z } from "zod";

export type ArticleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
export type ArticleSectionType =
  | "PARAGRAPH"
  | "HEADING"
  | "QUOTE"
  | "IMAGE"
  | "EMBED"
  | "CODE"
  | "DIVIDER"
  | "LIST";

export interface ArticleAuthor {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  bio: string | null;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface ArticleCoverImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  blurDataUrl?: string;
}

export interface ArticleSection {
  id: string;
  type: ArticleSectionType;
  order: number;
  content?: string;
  level?: number;               // for HEADING
  url?: string;                 // for IMAGE / EMBED
  caption?: string;             // for IMAGE
  attribution?: string;         // for QUOTE
  language?: string;            // for CODE
  mediaAssetId?: string;
  items?: string[];             // for LIST
}

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ArticleCoverImage | null;
  category: ArticleCategory;
  author: ArticleAuthor;
  tags: string[];
  isPremium: boolean;
  readTimeMinutes: number;
  publishedAt: string;
  viewCount: number;
  sourceUrl: string | null;
  ogImageUrl: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  sections: ArticleSection[];
  isBookmarked: boolean | null;
  relatedArticles: ArticleSummary[];
}

// ─── Zod schemas for forms ───────────────────────────────────────────────────

export const CreateArticleSectionSchema = z.object({
  type: z.enum(["PARAGRAPH", "HEADING", "QUOTE", "IMAGE", "EMBED", "CODE", "DIVIDER", "LIST"]),
  order: z.number().int().min(0),
  content: z.string().optional(),
  level: z.number().int().min(1).max(6).optional(),
  url: z.string().url().optional(),
  caption: z.string().optional(),
  attribution: z.string().optional(),
  language: z.string().optional(),
  mediaAssetId: z.string().optional(),
  items: z.array(z.string()).optional(),
});

export const CreateArticleSchema = z.object({
  title: z.string().min(5).max(300),
  slug: z.string().min(3).max(300).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().min(10).max(500),
  coverImageId: z.string().optional(),
  categoryId: z.string(),
  authorId: z.string(),
  tagIds: z.array(z.string()).optional(),
  sections: z.array(CreateArticleSectionSchema),
  isPremium: z.boolean().default(false),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export type CreateArticleDto = z.infer<typeof CreateArticleSchema>;
export type UpdateArticleDto = Partial<CreateArticleDto>;
