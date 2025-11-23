import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    // Only admin can access weekly absences
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    // Calculate date range for the past week (last 7 days)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const oneWeekAgo = new Date(today)
    oneWeekAgo.setDate(today.getDate() - 7)
    oneWeekAgo.setHours(0, 0, 0, 0)

    // Get all active staff members
    const { data: allStaff } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        employee_id,
        department_id,
        departments (
          name
        )
      `,
      )
      .eq("is_active", true)
      .in("role", ["staff", "department_head", "nsp", "intern", "contract"])

    if (!allStaff || allStaff.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const absences: any[] = []

    // Check each staff member's attendance for the past week
    for (const staff of allStaff) {
      const { data: attendanceRecords } = await supabase
        .from("attendance_records")
        .select("check_in_time")
        .eq("user_id", staff.id)
        .gte("check_in_time", oneWeekAgo.toISOString())
        .lte("check_in_time", today.toISOString())

      const attendanceCount = attendanceRecords?.length || 0
      const expectedDays = 5 // Assuming 5 working days per week

      // Flag staff who missed 3 or more days in the week
      if (attendanceCount <= expectedDays - 3) {
        const daysMissed = expectedDays - attendanceCount
        absences.push({
          user_id: staff.id,
          first_name: staff.first_name,
          last_name: staff.last_name,
          email: staff.email,
          employee_id: staff.employee_id,
          department_name: staff.departments?.name || "No Department",
          days_missed: daysMissed,
          issue: `Missed ${daysMissed} day${daysMissed > 1 ? "s" : ""} this week`,
        })
      }
    }

    // Sort by days missed (highest first)
    absences.sort((a, b) => b.days_missed - a.days_missed)

    return NextResponse.json({ success: true, data: absences })
  } catch (error) {
    console.error("[v0] Weekly absences API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
