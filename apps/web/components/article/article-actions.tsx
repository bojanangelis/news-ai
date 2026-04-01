"use client";

import { useBookmark } from "@/hooks/useBookmark";

interface Props {
  articleId: string;
  isBookmarked: boolean | null;
}

export function ArticleActions({ articleId, isBookmarked }: Props) {
  const { isBookmarked: bookmarked, toggle, loading } = useBookmark(articleId, isBookmarked);

  return (
    <div className="flex items-center gap-3 my-4">
      <button
        onClick={toggle}
        disabled={loading}
        className={[
          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
          bookmarked
            ? "bg-accent text-white hover:bg-accent/90"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700",
          loading ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        aria-label={bookmarked ? "Remove bookmark" : "Save article"}
      >
        <svg className="h-4 w-4" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 21l-5-4-5 4V5a2 2 0 012-2h6a2 2 0 012 2z" />
        </svg>
        {bookmarked ? "Saved" : "Save"}
      </button>

      <ShareButton />
    </div>
  );
}

function ShareButton() {
  function share() {
    if (navigator.share) {
      navigator.share({ url: window.location.href, title: document.title });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <button
      onClick={share}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      Share
    </button>
  );
}
