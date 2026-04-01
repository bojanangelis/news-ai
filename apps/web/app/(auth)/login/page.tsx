import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
      <p className="text-sm text-neutral-500 mb-8">Sign in to your NewsPlus account</p>
      <LoginForm redirectTo={next ?? "/"} />
      <p className="mt-6 text-center text-sm text-neutral-500">
        No account?{" "}
        <a href="/register" className="font-medium text-accent hover:underline">
          Create one free
        </a>
      </p>
    </div>
  );
}
