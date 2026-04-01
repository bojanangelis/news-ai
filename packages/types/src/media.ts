export type MediaAssetType = "IMAGE" | "VIDEO" | "DOCUMENT";

export interface MediaAsset {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  type: MediaAssetType;
  uploadedAt: string;
}
