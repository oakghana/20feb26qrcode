import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role and department
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "department_head")) {
      return NextResponse.json({ error: "Forbidden: Admin or Department Head access required" }, { status: 403 })
    }

    // Get department filter from query params
    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get("department_id")

    // Call the function with department filter for department heads
    const functionParam = profile.role === "department_head" ? profile.department_id : departmentId || null

    const { data: sharedDevices, error: devicesError } = await supabase.rpc("get_weekly_device_sharing_by_department", {
      dept_id: functionParam,
    })

    if (devicesError) {
      // Handle case where function doesn't exist yet
      if (devicesError.code === "42883" || devicesError.message?.includes("does not exist")) {
        console.log("[v0] Weekly device sharing function not created yet")
        return NextResponse.json({ data: [], message: "Device tracking system not yet initialized" })
      }
      console.error("Error fetching weekly shared devices:", devicesError)
      return NextResponse.json({ error: "Failed to fetch device sharing data" }, { status: 500 })
    }

    return NextResponse.json({ data: sharedDevices || [] })
  } catch (error) {
    console.error("Weekly device sharing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
