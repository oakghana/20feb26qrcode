import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PersonalAttendanceHistory } from "@/components/attendance/personal-attendance-history"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function MyAttendancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <DashboardLayout>
      <PersonalAttendanceHistory />
    </DashboardLayout>
  )
}
