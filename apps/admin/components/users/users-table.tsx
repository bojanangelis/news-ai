"use client"

import { useState } from "react"
import { adminClientFetch } from "@/lib/client-api"
import { useToast } from "@/components/ui/toast"

const ROLES = ["SUPER_ADMIN", "EDITOR", "WRITER", "ANALYST", "READER"] as const
type Role = (typeof ROLES)[number]

interface UserRow {
  id: string
  email: string
  name: string | null
  role: Role
  isActive: boolean
  createdAt: string
  _count?: { bookmarks: number; articleViews: number }
}

interface Props {
  users: UserRow[]
  total: number
  totalPages: number
  currentPage: number
}

const ROLE_STYLES: Record<Role, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  EDITOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  WRITER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ANALYST: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READER: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  EDITOR: "Editor",
  WRITER: "Writer",
  ANALYST: "Analyst",
  READER: "Reader",
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : email[0].toUpperCase()
  const colors = [
    "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
    "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
  ]
  const idx = (name ?? email).charCodeAt(0) % colors.length
  return (
    <div className={`h-8 w-8 rounded-full ${colors[idx]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

interface CreateFormData {
  name: string
  email: string
  password: string
  role: Role
}

export function UsersTable({ users: initial, total, totalPages, currentPage }: Props) {
  const [users, setUsers] = useState(initial)
  const [searchQ, setSearchQ] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "">("")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CreateFormData>({ name: "", email: "", password: "", role: "READER" })
  const [showPassword, setShowPassword] = useState(false)
  const { toast, confirm } = useToast()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("All fields are required")
      return
    }
    setCreating(true)
    try {
      // adminClientFetch returns the full TransformInterceptor response: { data: UserRow, timestamp }
      const res = await adminClientFetch<{ data: UserRow }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      })
      const newUser = res.data
      setUsers((prev) => [{ ...newUser, _count: { bookmarks: 0, articleViews: 0 } }, ...prev])
      setForm({ name: "", email: "", password: "", role: "READER" })
      setShowCreate(false)
      toast.success(`User ${newUser.email} created`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user"
      toast.error(msg.includes("409") ? "Email already in use" : msg)
    } finally {
      setCreating(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    try {
      await adminClientFetch(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      toast.success("Role updated")
    } catch {
      toast.error("Failed to update role")
    }
  }

  async function handleBan(userId: string, isActive: boolean) {
    const ok = await confirm({
      title: `${isActive ? "Ban" : "Unban"} this user?`,
      description: isActive
        ? "The user will lose access immediately and all sessions will be revoked."
        : "The user will regain access to the platform.",
      confirmLabel: isActive ? "Ban user" : "Unban user",
      variant: isActive ? "destructive" : "default",
    })
    if (!ok) return
    try {
      await adminClientFetch(`/admin/users/${userId}/${isActive ? "ban" : "unban"}`, { method: "POST" })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !isActive } : u)))
      toast.success(isActive ? "User banned" : "User unbanned")
    } catch {
      toast.error(`Failed to ${isActive ? "ban" : "unban"} user`)
    }
  }

  async function handleDelete(userId: string, email: string) {
    const ok = await confirm({
      title: "Delete user?",
      description: `This will permanently delete ${email} and all their data. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      variant: "destructive",
    })
    if (!ok) return
    try {
      await adminClientFetch(`/admin/users/${userId}`, { method: "DELETE" })
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success("User deleted")
    } catch {
      toast.error("Failed to delete user")
    }
  }

  const filtered = users.filter((u) => {
    const matchesQ =
      !searchQ ||
      u.email.toLowerCase().includes(searchQ.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(searchQ.toLowerCase())
    const matchesRole = !roleFilter || u.role === roleFilter
    return matchesQ && matchesRole
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          placeholder="Search by name or email…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="h-9 w-64 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "")}
          className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <span className="text-sm text-neutral-500">{total?.toLocaleString()} users</span>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="ml-auto h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create User
        </button>
      </div>

      {/* Create User Panel */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-accent/30 bg-accent/5 dark:bg-accent/10 p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Full Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="h-9 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="h-9 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  className="h-9 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                className="h-9 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setForm({ name: "", email: "", password: "", role: "READER" }) }}
              className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide hidden md:table-cell">Activity</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} email={user.email} />
                      <div>
                        <p className="font-medium leading-tight">
                          {user.name ?? <span className="text-neutral-400 italic font-normal">No name</span>}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 ${ROLE_STYLES[user.role]}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? "text-green-600" : "text-red-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-400"}`} />
                      {user.isActive ? "Active" : "Banned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-3 text-xs text-neutral-500">
                      <span title="Bookmarks">🔖 {user._count?.bookmarks ?? 0}</span>
                      <span title="Article views">👁 {user._count?.articleViews ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs hidden lg:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleBan(user.id, user.isActive)}
                        className={`text-xs transition-colors ${user.isActive ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}
                      >
                        {user.isActive ? "Ban" : "Unban"}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={`?page=${currentPage - 1}`}
                className="h-8 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors inline-flex items-center"
              >
                Previous
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={`?page=${currentPage + 1}`}
                className="h-8 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors inline-flex items-center"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
