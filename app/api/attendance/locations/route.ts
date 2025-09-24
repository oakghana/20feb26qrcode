import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Locations API - Starting request")
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Locations API - Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Locations API - User authenticated:", user.id)

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, assigned_location_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.log("[v0] Locations API - Profile error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Only admins and department heads can see all locations
    if (!["admin", "department_head"].includes(profile.role)) {
      console.log("[v0] Locations API - Insufficient permissions for role:", profile.role)
      return NextResponse.json({ error: "Insufficient permissions to view locations" }, { status: 403 })
    }

    const { data: locations, error } = await supabase
      .from("geofence_locations")
      .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        radius_meters,
        district_id
      `)
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("[v0] Locations API - Database error:", error)
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }

    console.log("[v0] Locations API - Found locations:", locations?.length)

    return NextResponse.json({
      success: true,
      data: locations,
    })
  } catch (error) {
    console.error("[v0] Locations API - Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
