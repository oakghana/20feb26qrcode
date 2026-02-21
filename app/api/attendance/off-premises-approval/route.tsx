import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user (supervisor)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { requestId, action, rejectionReason } = body

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      )
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    // Get the off-premises request
    const { data: offPremisesRequest, error: fetchError } = await supabase
      .from("pending_offpremises_checkins")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError || !offPremisesRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      )
    }

    // Verify supervisor has permission to approve this request
    // TODO: Add role-based permission check (supervisor must be supervisor of the user)

    // Update the request status
    const updateData: any = {
      status: action === "approve" ? "approved" : "rejected",
      approved_by_id: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (action === "reject") {
      updateData.rejection_reason = rejectionReason
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("pending_offpremises_checkins")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error updating off-premises request:", updateError)
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      )
    }

    // If approved, create automatic check-in record
    if (action === "approve") {
      const { error: checkInError } = await supabase
        .from("attendance_records")
        .insert({
          user_id: offPremisesRequest.user_id,
          check_in_time: new Date().toISOString(),
          check_in_location_id: null, // Off-premises, no specific location
          check_in_location_name: offPremisesRequest.current_location_name,
          check_in_method: "off_premises_approved",
          latitude: offPremisesRequest.latitude,
          longitude: offPremisesRequest.longitude,
          accuracy: offPremisesRequest.accuracy,
          device_info: offPremisesRequest.device_info,
          on_official_duty_outside_premises: true,
          is_off_premises: true,
          notes: `Approved off-premises check-in: ${offPremisesRequest.reason}`,
          attendance_date: new Date().toISOString().split("T")[0],
        })

      if (checkInError) {
        console.error("[v0] Error creating automatic check-in:", checkInError)
        // Still return success but note the issue
      }
    }

    // TODO: Send notification to user about approval/rejection

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Request ${action === "approve" ? "approved" : "rejected"} successfully`,
    })
  } catch (error) {
    console.error("[v0] Error processing off-premises approval:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
