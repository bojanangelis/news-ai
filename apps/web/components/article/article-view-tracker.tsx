"use client";

import { useEffect } from "react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface Props {
  articleId: string;
}

/**
 * Fires a view event on mount. Invisible — renders nothing.
 * Works even on pages that immediately redirect (scraped articles),
 * because the client component runs before the redirect executes.
 */
export function ArticleViewTracker({ articleId }: Props) {
  useEffect(() => {
    const key = "np_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }

    fetch(`${API_URL}/v1/articles/${articleId}/view?sessionId=${sid}`, {
      method: "POST",
      keepalive: true,
    }).catch(() => null); // fire-and-forget, never block UI
  }, [articleId]);

  return null;
}
