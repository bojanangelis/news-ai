import { cookies } from "next/headers";

export interface AdminSession {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "EDITOR", "WRITER", "ANALYST"]);

function decodeJwt(token: string): AdminSession | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as AdminSession;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  const session = decodeJwt(token);
  if (!session || !ADMIN_ROLES.has(session.role)) return null;
  return session;
}
