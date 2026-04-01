import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookmarkList } from "@/components/feed/bookmark-list";
import { getSessionFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Saved Articles",
  robots: { index: false },
};

export default async function SavedPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/saved");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Saved Articles</h1>
      <BookmarkList userId={session.sub} />
    </div>
  );
}
