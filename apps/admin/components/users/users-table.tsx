"use client"

import { useState } from "react"
import { adminClientFetch } from "@/lib/client-api"

const ROLES = ["SUPER_ADMIN", "EDITOR", "WRITER", "ANALYST", "READER"] as const
type Role = (typeof ROLES)[number]

interface UserRow {
  id: string
  email: string
  name: string | null
  role: Role
  isActive: boolean
  createdAt: string
}

interface Props {
  users: UserRow[]
  total: number
  totalPages: number
  currentPage: number
}

const ROLE_STYLES: Record<Role, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  EDITOR:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  WRITER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ANALYST:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READER:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
}

export function UsersTable({
  users: initial,
  total,
  totalPages,
  currentPage,
}: Props) {
  const [users, setUsers] = useState(initial)
  const [searchQ, setSearchQ] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "">("")

  async function handleRoleChange(userId: string, newRole: Role) {
    try {
      await adminClientFetch(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      )
    } catch {
      // TODO: toast error
    }
  }

  async function handleBan(userId: string, isActive: boolean) {
    const action = isActive ? "ban" : "unban"
    if (!confirm(`${action === "ban" ? "Ban" : "Unban"} this user?`)) return
    try {
      await adminClientFetch(`/admin/users/${userId}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !isActive } : u)),
      )
    } catch {
      // TODO: toast error
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="Search email or name…"
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
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-neutral-500 flex items-center">
          {total?.toLocaleString()} users
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">
                User
              </th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">
                Joined
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ?
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  No users found
                </td>
              </tr>
            : filtered.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {user.name ?? (
                          <span className="text-neutral-400 italic">
                            No name
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as Role)
                      }
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 ${ROLE_STYLES[user.role]}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        user.isActive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-400"}`}
                      />
                      {user.isActive ? "Active" : "Banned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {new Date(user.createdAt)?.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleBan(user.id, user.isActive)}
                      className={`text-xs transition-colors ${
                        user.isActive ?
                          "text-red-500 hover:text-red-700"
                        : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {user.isActive ? "Ban" : "Unban"}
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
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
