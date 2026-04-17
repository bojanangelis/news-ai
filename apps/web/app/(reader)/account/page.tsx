import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth";
import { AccountClient } from "./account-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function AccountPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value ?? "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const [meRes, subRes] = await Promise.allSettled([
    fetch(`${API_URL}/v1/auth/me`, { headers: authHeader, cache: "no-store" }),
    fetch(`${API_URL}/v1/subscription/status`, { headers: authHeader, cache: "no-store" }),
  ]);

  const me = meRes.status === "fulfilled" ? await meRes.value.json().catch(() => ({})) : {};
  const sub = subRes.status === "fulfilled" ? await subRes.value.json().catch(() => ({})) : {};

  const user = me.data ?? null;
  const subscription = sub.data ?? null;

  if (!user) {
    redirect("/login");
  }

  return <AccountClient initialUser={user} initialSub={subscription} />;
}
