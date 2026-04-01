import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import { HomepageEditor } from "@/components/homepage/homepage-editor";
import type { HomepageSection } from "@repo/types";

export const metadata: Metadata = { title: "Homepage Editor" };

export const dynamic = "force-dynamic";

export default async function HomepagePage() {
  let sections: HomepageSection[] = [];
  try {
    const res = await adminFetch<{ data: HomepageSection[] }>("/homepage/sections");
    sections = res.data;
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage Editor</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Drag and drop to reorder sections. Changes publish immediately.
        </p>
      </div>

      <HomepageEditor sections={sections} />
    </div>
  );
}
