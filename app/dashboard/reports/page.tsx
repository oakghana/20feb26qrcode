import { AttendanceReports } from "@/components/admin/attendance-reports"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user has admin or department_head role
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (!profile || !["admin", "regional_manager", "department_head"].includes(profile.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-gray-900 to-black">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-700 to-purple-800 rounded-2xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-300 to-purple-300 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-lg text-gray-300 mt-2 max-w-2xl mx-auto">
              Comprehensive attendance insights and data-driven decision making for all Registered QCC Location nationwide
            </p>
          </div>
        </div>

        <div className="rounded-2xl shadow-xl bg-neutral-900/80 border border-neutral-800 p-2">
          <AttendanceReports />
        </div>
      </div>
    </div>
  )
}
