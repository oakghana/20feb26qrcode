import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Users API: Starting user fetch")
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Users API: Authentication failed", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Users API: User authenticated", user.id)

    // Check if user has admin or department_head role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "department_head"].includes(profile.role)) {
      console.log("[v0] Users API: Insufficient permissions", profile?.role)
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    console.log("[v0] Users API: Permission check passed", profile.role)

    const { data: users, error } = await supabase
      .from("user_profiles")
      .select(`
        id,
        first_name,
        last_name,
        email,
        employee_id,
        role,
        is_active
      `)
      .eq("is_active", true)
      .order("first_name")

    if (error) {
      console.error("[v0] Users fetch error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch users",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Users API: Successfully fetched", users?.length || 0, "users")

    return NextResponse.json(
      {
        success: true,
        users: users || [],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Users API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
