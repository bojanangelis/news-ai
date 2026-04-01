"use client";

import Link from "next/link";
import { useState } from "react";
import { authApi } from "@/lib/client-api";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser | null;
}

export function NavUser({ user }: Props) {
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    window.location.href = "/";
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/login"
          className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="inline-flex h-9 items-center rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="h-9 w-9 rounded-full bg-accent/20 text-accent font-semibold text-sm flex items-center justify-center hover:bg-accent/30 transition-colors"
        aria-label="Account menu"
      >
        {user.email[0]?.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1 z-50">
          <Link href="/for-you" className="block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">For You</Link>
          <Link href="/saved" className="block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">Saved</Link>
          <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">Settings</Link>
          <hr className="my-1 border-neutral-100 dark:border-neutral-800" />
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-50 dark:hover:bg-neutral-800">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
