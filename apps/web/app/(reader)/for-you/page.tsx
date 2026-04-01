import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PersonalizedFeed } from "@/components/feed/personalized-feed";
import { getSessionFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "For You",
  robots: { index: false },
};

export default async function ForYouPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/for-you");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">For You</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Personalized stories based on your topics and reading history.
        </p>
      </div>
      <PersonalizedFeed />
    </div>
  );
}
