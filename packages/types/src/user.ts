export type UserRole = "SUPER_ADMIN" | "EDITOR" | "WRITER" | "ANALYST" | "READER";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  isPremium: boolean;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  isPremium: boolean;
}
