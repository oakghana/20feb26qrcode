import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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

    // Get today's attendance record
    const today = new Date().toISOString().split("T")[0]
    const { data: attendanceRecord, error: recordError } = await supabase
      .from("attendance_records")
      .select("*, geofence_locations(name)")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .maybeSingle()

    if (recordError) {
      console.error("[v0] Error fetching attendance record:", recordError)
      return NextResponse.json({ error: "Failed to fetch attendance record" }, { status: 500 })
    }

    if (!attendanceRecord) {
      return NextResponse.json({ error: "No check-in record found for today" }, { status: 400 })
    }

    if (attendanceRecord.check_out_time) {
      return NextResponse.json(
        { error: "You have already checked out today" },
        { status: 400 },
      )
    }

    // Get user profile with assigned location
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, assigned_location_id, geofence_locations(name)")
      .eq("id", user.id)
      .maybeSingle()

    const body = await request.json()
    const { latitude, longitude, location_name, early_checkout_reason } = body

    const checkOutTime = new Date()
    const checkInTime = new Date(attendanceRecord.check_in_time)
    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

    // Determine if this is Tema Port staff
    const assignedLocationName = userProfile?.geofence_locations?.name?.toLowerCase() || ""
    const isTemaPort = assignedLocationName.includes("tema port")
    
    // Calculate if checkout is early based on assigned location
    const checkoutHour = checkOutTime.getHours()
    const earlyCheckoutThreshold = isTemaPort ? 16 : 17 // 4 PM for Tema Port, 5 PM for others
    const isEarlyCheckout = checkoutHour < earlyCheckoutThreshold

    console.log("[v0] ===== API CHECKOUT VALIDATION =====")
    console.log("[v0] Assigned location:", assignedLocationName)
    console.log("[v0] Is Tema Port?:", isTemaPort)
    console.log("[v0] Checkout hour:", checkoutHour)
    console.log("[v0] Early checkout threshold:", earlyCheckoutThreshold)
    console.log("[v0] Is early checkout?:", isEarlyCheckout)
    console.log("[v0] Reason provided?:", !!early_checkout_reason)
    console.log("[v0] ====================================")

    // Validate early checkout reason if needed
    if (isEarlyCheckout && !early_checkout_reason) {
      const thresholdTime = isTemaPort ? "4:00 PM" : "5:00 PM"
      return NextResponse.json(
        { 
          error: `Early checkout detected. You are checking out before ${thresholdTime}. Please provide a reason for early checkout.` 
        },
        { status: 400 },
      )
    }

    // Update attendance record
    const updateData: any = {
      check_out_time: checkOutTime.toISOString(),
      work_hours: Math.round(workHours * 100) / 100,
      check_out_method: "gps",
      check_out_location_name: location_name || "Unknown Location",
      updated_at: new Date().toISOString(),
    }

    if (latitude && longitude) {
      updateData.check_out_latitude = latitude
      updateData.check_out_longitude = longitude
    }

    // Only set early_checkout_reason if actually early
    if (isEarlyCheckout && early_checkout_reason) {
      updateData.early_checkout_reason = early_checkout_reason
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from("attendance_records")
      .update(updateData)
      .eq("id", attendanceRecord.id)
      .select("*, geofence_locations(name)")
      .single()

    if (updateError) {
      console.error("[v0] Error updating attendance record:", updateError)
      return NextResponse.json({ error: "Failed to record checkout" }, { status: 500 })
    }

    // Create audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "check_out",
      table_name: "attendance_records",
      record_id: updatedRecord.id,
      new_values: {
        ...updateData,
        work_hours: workHours,
        is_early_checkout: isEarlyCheckout,
        is_tema_port_staff: isTemaPort,
      },
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    const message = isEarlyCheckout 
      ? `Successfully checked out early from ${location_name}. Your reason has been recorded. Total work hours: ${workHours.toFixed(2)} hours.`
      : `Successfully checked out from ${location_name}. Great work today! Total work hours: ${workHours.toFixed(2)} hours.`

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message,
      earlyCheckout: isEarlyCheckout,
    })
  } catch (error) {
    console.error("[v0] Check-out error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
