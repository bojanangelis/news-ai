import { redirect } from "next/navigation";

// Public registration is disabled — accounts are created by admins only.
export default function RegisterPage() {
  redirect("/login");
}
