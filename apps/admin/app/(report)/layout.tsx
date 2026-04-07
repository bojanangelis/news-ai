// Public route group — no authentication required.
// Used for advertiser-facing share links (campaign reports).
export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
