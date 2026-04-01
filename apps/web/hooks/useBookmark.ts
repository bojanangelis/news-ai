"use client";

import { useState, useCallback } from "react";
import { bookmarksApi } from "@/lib/client-api";

export function useBookmark(articleId: string, initialState: boolean | null) {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialState ?? false);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked); // optimistic update
    try {
      if (wasBookmarked) {
        await bookmarksApi.remove(articleId);
      } else {
        await bookmarksApi.add(articleId);
      }
    } catch {
      setIsBookmarked(wasBookmarked); // revert on failure
    } finally {
      setLoading(false);
    }
  }, [articleId, isBookmarked, loading]);

  return { isBookmarked, toggle, loading };
}
