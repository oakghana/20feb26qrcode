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

    // Check if user has admin or department_head role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "department_head"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get all active users
    const { data: users, error } = await supabase
      .from("user_profiles")
      .select(`
        id,
        first_name,
        last_name,
        email,
        employee_id,
        role,
        is_active,
        departments (
          name
        )
      `)
      .eq("is_active", true)
      .order("first_name")

    if (error) {
      console.error("Users fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: users || [],
    })
  } catch (error) {
    console.error("Users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
