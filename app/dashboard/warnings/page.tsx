import type { Metadata } from "next"
import AdminWarningManager from "@/components/admin/admin-warning-manager"
import WarningsArchive from "@/components/admin/warnings-archive"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Warning Management - QCC Attendance",
  description: "Manage and archive staff warnings",
}

export default async function WarningsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard?error=access_denied")
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Warning Management System</h1>
        <p className="text-muted-foreground mt-2">Issue warnings to staff and view archived warning records</p>
      </div>

      <AdminWarningManager userRole={profile.role} />

      <WarningsArchive />
    </div>
  )
}
