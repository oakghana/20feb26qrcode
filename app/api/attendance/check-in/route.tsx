import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { validateCheckoutLocation, type LocationData } from "@/lib/geolocation"

// ===== FINAL HARD RESET REBUILD =====
// Timestamp: 2026-02-21T21:00:00Z
// Issue: Server running OLD compiled code - forcing complete rebuild
// This endpoint MUST save check-in to supabase attendance table
// ====================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { latitude, longitude, accuracy, location_source, device_info, location_name, lateness_reason } = body

    if (!latitude || !longitude) {
      return NextResponse.json({
        error: "Location data is required for check-in",
        success: false,
      }, { status: 400 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({
        error: "User profile not found",
        success: false,
      }, { status: 404 })
    }

    // Check if already checked in today
    const today = new Date().toISOString().split("T")[0]
    const { data: existingAttendance } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single()

    if (existingAttendance?.check_in_time) {
      return NextResponse.json({
        error: "Already checked in today",
        success: false,
        data: existingAttendance,
      }, { status: 400 })
    }

    // Validate location
    const locationValidation = await validateCheckInLocation(latitude, longitude, device_info)

    if (!locationValidation?.isValid) {
      return NextResponse.json({
        error: "Check-in location not valid or out of range",
        success: false,
        validation: locationValidation,
      }, { status: 403 })
    }

    // Get check-in location name
    const checkInLocationName = location_name || locationValidation.nearestLocation?.name || "Unknown Location"
    const checkInLocationId = locationValidation.nearestLocation?.id

    // Create or update attendance record
    const checkInTime = new Date().toISOString()
    const checkInData: any = {
      user_id: user.id,
      date: today,
      check_in_time: checkInTime,
      check_in_location_name: checkInLocationName,
      check_in_location_id: checkInLocationId,
      check_in_latitude: latitude,
      check_in_longitude: longitude,
      location_source,
      device_type: device_info?.device_type || "desktop",
      lateness_reason: lateness_reason || null,
      status: "present",
    }

    let result

    if (existingAttendance?.id) {
      // Update existing record
      result = await supabase
        .from("attendance_records")
        .update(checkInData)
        .eq("id", existingAttendance.id)
        .select()
        .single()
    } else {
      // Insert new record
      result = await supabase
        .from("attendance_records")
        .insert([checkInData])
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Successfully checked in at ${checkInLocationName}`,
    })
  } catch (error) {
    console.error("[v0] Check-in error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Check-in failed",
      success: false,
    }, { status: 500 })
  }
}
