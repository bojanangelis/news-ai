import type { Metadata } from "next"
import { adminFetch } from "@/lib/api"
import { UsersTable } from "@/components/users/users-table"

export const metadata: Metadata = { title: "Users" }

interface Props {
  searchParams: Promise<{ page?: string; role?: string; q?: string }>
}

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  createdAt: string
}

export default async function UsersPage({ searchParams }: Props) {
  const { page = "1", role, q } = await searchParams

  const qs = new URLSearchParams({
    page,
    limit: "25",
    ...(role && { role }),
    ...(q && { q }),
  }).toString()

  let data: { data: UserRow[]; total: number; totalPages: number } = {
    data: [],
    total: 0,
    totalPages: 0,
  }
  try {
    const res = await adminFetch<typeof data>(`/admin/users?${qs}`)
    data = res
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {data.total?.toLocaleString()} registered users
        </p>
      </div>

      <UsersTable
        users={data.data}
        total={data.total}
        totalPages={data.totalPages}
        currentPage={parseInt(page, 10)}
      />
    </div>
  )
}
