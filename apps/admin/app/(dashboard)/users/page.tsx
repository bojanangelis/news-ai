import type { Metadata } from "next"
import { adminFetch } from "@/lib/api"
import { UsersTable } from "@/components/users/users-table"

export const metadata: Metadata = { title: "Users" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count?: { bookmarks: number; articleViews: number }
}

export default async function UsersPage({ searchParams }: Props) {
  const { page = "1" } = await searchParams

  // The TransformInterceptor wraps the response: { data: <payload>, timestamp }
  // findAllUsers returns { data: UserRow[], total, totalPages }
  // So the full shape from adminFetch is { data: { data: UserRow[], total, totalPages }, timestamp }
  let users: UserRow[] = []
  let total = 0
  let totalPages = 0

  try {
    const res = await adminFetch<{ data: { data: UserRow[]; total: number; totalPages: number } }>(
      `/admin/users?page=${page}&limit=25`,
    )
    users = res.data.data
    total = res.data.total
    totalPages = res.data.totalPages
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {total.toLocaleString()} registered users
        </p>
      </div>

      <UsersTable
        users={users}
        total={total}
        totalPages={totalPages}
        currentPage={parseInt(page, 10)}
      />
    </div>
  )
}
