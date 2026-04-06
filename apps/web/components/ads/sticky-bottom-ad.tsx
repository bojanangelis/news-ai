"use client";

import { useState } from "react";
import type { ActiveAd } from "@repo/types";
import { AdRenderer } from "./ad-renderer";

interface Props {
  ad: ActiveAd;
}

/**
 * Sticky bottom banner — stays pinned at the bottom of the viewport.
 * User can dismiss it (dismissed stays gone for the session).
 */
export function StickyBottomAd({ ad }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(`np_sticky_dismissed_${ad.id}`) === "1";
  });

  function dismiss() {
    sessionStorage.setItem(`np_sticky_dismissed_${ad.id}`, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-[50px] md:h-[90px] shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
      <AdRenderer
        ad={ad}
        className="w-full h-full"
        onClose={dismiss}
        showLabel
      />
    </div>
  );
}
