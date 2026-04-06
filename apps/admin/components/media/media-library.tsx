"use client";

import { useState, useEffect, useRef } from "react";
import { mediaAdminApi } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { MediaAsset } from "@repo/types";

export function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, confirm } = useToast();

  async function loadAssets() {
    try {
      const res = await mediaAdminApi.list() as { data: MediaAsset[] };
      setAssets(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssets(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await mediaAdminApi.upload(fd);
      await loadAssets();
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete this asset?",
      description: "The image will be permanently removed from storage.",
      confirmLabel: "Delete image",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await mediaAdminApi.delete(id);
      setAssets((a) => a.filter((asset) => asset.id !== id));
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} id="media-upload" />
        <label htmlFor="media-upload"
          className={[
            "inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold cursor-pointer transition-colors gap-2",
            uploading ? "bg-neutral-200 text-neutral-500 cursor-wait" : "bg-accent text-white hover:bg-accent/90",
          ].join(" ")}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploading ? "Uploading..." : "Upload Image"}
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.altText ?? ""} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <div className="flex gap-2">
                  {/* Open in new tab */}
                  <a href={asset.url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                    title="Open image">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {/* Copy URL */}
                  <button onClick={() => { navigator.clipboard.writeText(asset.url); toast.success("URL copied!"); }}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                    title="Copy URL">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {/* Delete */}
                  <button onClick={() => handleDelete(asset.id)}
                    className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    title="Delete">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {/* File name */}
                <p className="text-[10px] text-white/70 px-2 text-center truncate max-w-full">
                  {asset.url.split("/").pop()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-16 text-neutral-400">No media uploaded yet</p>
      )}
    </div>
  );
}
