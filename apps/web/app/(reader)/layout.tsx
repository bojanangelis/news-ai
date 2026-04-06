import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BreakingNewsBanner } from "@/components/layout/breaking-news-banner";
import { StickyBottomLoader } from "@/components/ads";

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreakingNewsBanner />
      <SiteHeader />
      <main className="min-h-screen">{children}</main>
      <SiteFooter />
      <StickyBottomLoader />
    </>
  );
}
