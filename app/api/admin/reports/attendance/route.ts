import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user and check admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin or department_head role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "department_head"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate =
      searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const endDate = searchParams.get("end_date") || new Date().toISOString().split("T")[0]
    const departmentId = searchParams.get("department_id")
    const userId = searchParams.get("user_id")

    let query = supabase
      .from("attendance_records")
      .select(`
        *,
        geofence_locations!check_in_location_id (
          name,
          address
        )
      `)
      .gte("check_in_time", `${startDate}T00:00:00`)
      .lte("check_in_time", `${endDate}T23:59:59`)

    // Apply user filter if specified
    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: attendanceRecords, error } = await query.order("check_in_time", { ascending: false })

    if (error) {
      console.error("Attendance report error:", error)
      return NextResponse.json({ error: "Failed to fetch attendance report" }, { status: 500 })
    }

    const userIds = [...new Set(attendanceRecords.map((record) => record.user_id))]
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select(`
        id,
        first_name,
        last_name,
        employee_id,
        department_id,
        departments (
          name,
          code
        )
      `)
      .in("id", userIds)

    const userMap = new Map(userProfiles?.map((user) => [user.id, user]) || [])

    let filteredRecords = attendanceRecords
    if (departmentId || (profile.role === "department_head" && profile.department_id)) {
      const targetDeptId = departmentId || profile.department_id
      filteredRecords = attendanceRecords.filter((record) => {
        const user = userMap.get(record.user_id)
        return user?.department_id === targetDeptId
      })
    }

    const enrichedRecords = filteredRecords.map((record) => ({
      ...record,
      user_profiles: userMap.get(record.user_id) || null,
    }))

    // Calculate summary statistics
    const totalRecords = enrichedRecords.length
    const totalWorkHours = enrichedRecords.reduce((sum, record) => sum + (record.work_hours || 0), 0)
    const averageWorkHours = totalRecords > 0 ? totalWorkHours / totalRecords : 0

    // Group by status
    const statusCounts = enrichedRecords.reduce(
      (acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Group by department
    const departmentStats = enrichedRecords.reduce(
      (acc, record) => {
        const deptName = record.user_profiles?.departments?.name || "Unknown"
        if (!acc[deptName]) {
          acc[deptName] = { count: 0, totalHours: 0 }
        }
        acc[deptName].count += 1
        acc[deptName].totalHours += record.work_hours || 0
        return acc
      },
      {} as Record<string, { count: number; totalHours: number }>,
    )

    return NextResponse.json({
      success: true,
      data: {
        records: enrichedRecords,
        summary: {
          totalRecords,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          averageWorkHours: Math.round(averageWorkHours * 100) / 100,
          statusCounts,
          departmentStats,
        },
      },
    })
  } catch (error) {
    console.error("Attendance report API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
