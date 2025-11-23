import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "it-admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get all staff members
    const { data: allStaff } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, email, employee_id, departments(name)")
      .eq("is_active", true)
      .neq("role", "admin")
      .neq("role", "it-admin")

    // Get attendance records for the date
    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("user_id, checkin_time, checkout_time")
      .gte("checkin_time", `${date}T00:00:00`)
      .lte("checkin_time", `${date}T23:59:59`)

    const attendanceMap = new Map()
    attendanceRecords?.forEach((record) => {
      attendanceMap.set(record.user_id, record)
    })

    const noCheckin: any[] = []
    const noCheckout: any[] = []
    const lateCheckin: any[] = []
    const earlyCheckout: any[] = []

    allStaff?.forEach((staff) => {
      const attendance = attendanceMap.get(staff.id)
      const staffData = {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        employee_id: staff.employee_id,
        department: staff.departments?.name || "N/A",
      }

      if (!attendance) {
        noCheckin.push(staffData)
      } else {
        if (!attendance.checkout_time) {
          noCheckout.push(staffData)
        }

        const checkinTime = new Date(attendance.checkin_time)
        const checkinHour = checkinTime.getHours()
        const checkinMinute = checkinTime.getMinutes()

        // Late if after 8:30 AM
        if (checkinHour > 8 || (checkinHour === 8 && checkinMinute > 30)) {
          lateCheckin.push(staffData)
        }

        // Early checkout if before 5:00 PM and has checkout
        if (attendance.checkout_time) {
          const checkoutTime = new Date(attendance.checkout_time)
          const checkoutHour = checkoutTime.getHours()
          if (checkoutHour < 17) {
            earlyCheckout.push(staffData)
          }
        }
      }
    })

    return NextResponse.json({
      noCheckin,
      noCheckout,
      lateCheckin,
      earlyCheckout,
    })
  } catch (error) {
    console.error("Error fetching attendance summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
