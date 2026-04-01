"use client";

import { adminClientFetch } from "@/lib/client-api";
import type { AdminSession } from "@/lib/auth";

interface Props {
  user: AdminSession;
}

export function AdminTopbar({ user }: Props) {
  async function handleLogout() {
    await adminClientFetch("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <header className="h-16 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500">{user.email}</span>
        <span className="text-xs font-semibold bg-accent/10 text-accent px-2.5 py-1 rounded-full capitalize">
          {user.role.replace(/_/g, " ").toLowerCase()}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-neutral-400 hover:text-red-600 transition-colors ml-2"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
