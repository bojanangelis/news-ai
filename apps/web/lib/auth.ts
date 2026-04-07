import { cookies } from "next/headers";

export interface SessionUser {
  sub: string;
  email: string;
  role: string;
  isPremium: boolean;
  iat: number;
  exp: number;
}

// Decode JWT payload without verifying signature (verification happens in the API)
// The API is the authoritative auth source; Next.js server components just read claims for UI purposes.
function decodeJwt(token: string): SessionUser | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as SessionUser;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  return decodeJwt(token);
}
