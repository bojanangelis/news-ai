import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = { title: "Sign In" };

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-accent">News</span>Plus Admin
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Editorial management system</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm p-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
