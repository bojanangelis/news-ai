import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Create your account</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Join NewsPlus — free forever, premium when you're ready.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
