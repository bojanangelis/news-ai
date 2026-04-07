"use client";

import { useEffect } from "react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface Props {
  articleId: string;
  sourceUrl: string;
}

/**
 * Used for scraped articles that should redirect to the original source.
 * Fires a view event first, then redirects — ensuring the view is counted
 * even though the user ends up on an external page.
 */
export function ArticleSourceRedirect({ articleId, sourceUrl }: Props) {
  useEffect(() => {
    const key = "np_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }

    // Track view, then redirect. Use keepalive so the fetch survives the navigation.
    fetch(`${API_URL}/v1/articles/${articleId}/view?sessionId=${sid}`, {
      method: "POST",
      keepalive: true,
    })
      .catch(() => null)
      .finally(() => {
        window.location.replace(sourceUrl);
      });
  }, [articleId, sourceUrl]);

  // Minimal loading state while the fetch+redirect happens (~100-300ms)
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-neutral-400">Redirecting to source…</p>
    </div>
  );
}
