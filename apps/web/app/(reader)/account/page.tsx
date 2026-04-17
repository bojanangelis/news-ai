import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth";
import { AccountClient } from "./account-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isActive: boolean;
}

export default async function AccountPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value ?? "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const [meRes, subRes] = await Promise.allSettled([
    fetch(`${API_URL}/v1/auth/me`, { headers: authHeader, cache: "no-store" }),
    fetch(`${API_URL}/v1/subscription/status`, { headers: authHeader, cache: "no-store" }),
    // TODO: fetch(`${API_URL}/v1/payment/cards`, { headers: authHeader, cache: "no-store" })
    // when Stripe integration is ready (Phase 2)
  ]);

  const me = meRes.status === "fulfilled" ? await meRes.value.json().catch(() => ({})) : {};
  const sub = subRes.status === "fulfilled" ? await subRes.value.json().catch(() => ({})) : {};

  const user = (me as { data?: unknown }).data ?? null;
  const subscription = (sub as { data?: unknown }).data ?? null;

  if (!user) redirect("/login");

  // Payment cards: empty until Stripe Phase 2
  const initialCards: PaymentCard[] = [];

  return (
    <AccountClient
      initialUser={user as never}
      initialSub={subscription as never}
      initialCards={initialCards}
    />
  );
}
