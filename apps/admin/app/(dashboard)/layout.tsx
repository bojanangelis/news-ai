import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  const isAdmin = ["SUPER_ADMIN", "EDITOR", "WRITER", "ANALYST"].includes(session.role);
  if (!isAdmin) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar role={session.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar user={session} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
