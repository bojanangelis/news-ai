import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionFromCookies } from "@/lib/auth";
import { getCategories } from "@/lib/api";
import { OnboardingClient } from "./onboarding-client";
import type { Category } from "@/components/onboarding/step-categories";

export const metadata: Metadata = {
  title: "Set up your feed",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  // Fetch categories server-side so the page renders fully on first load
  const result = await getCategories().catch(() => ({ data: [] as unknown[] }));
  const categories = (result.data as Category[]) ?? [];

  return <OnboardingClient categories={categories} />;
}
