export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  iconUrl: string | null;
  articleCount: number;
}
