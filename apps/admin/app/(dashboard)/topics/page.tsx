import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import { TopicsTable } from "@/components/topics/topics-table";

export const metadata: Metadata = { title: "Topics" };

export const revalidate = 120;

interface TopicRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  _count?: { followers: number; articles: number };
}

export default async function TopicsPage() {
  let topics: TopicRow[] = [];
  try {
    const res = await adminFetch<{ data: TopicRow[] }>("/topics");
    topics = res.data;
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="text-sm text-neutral-500 mt-1">{topics.length} topics</p>
      </div>

      <TopicsTable topics={topics} />
    </div>
  );
}
