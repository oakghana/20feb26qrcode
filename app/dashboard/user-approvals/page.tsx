import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserApprovalsClient } from "@/components/admin/user-approvals-client"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function UserApprovalsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user has admin role - user approvals are admin-only
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <UserApprovalsClient />
    </DashboardLayout>
  )
}
