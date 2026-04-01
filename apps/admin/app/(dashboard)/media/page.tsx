import type { Metadata } from "next";
import { MediaLibrary } from "@/components/media/media-library";

export const metadata: Metadata = { title: "Media Library" };

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <p className="text-sm text-neutral-500 mt-1">Upload and manage images</p>
      </div>
      <MediaLibrary />
    </div>
  );
}
