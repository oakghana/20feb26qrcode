import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { latitude, longitude, accuracy, location_name, reason, device_info } = body

    if (!latitude || !longitude || !reason || !location_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get user profile to find supervisor
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, name, assigned_location_id, departments")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    // Create pending off-premises request
    const { data: offPremisesRequest, error: createError } = await supabase
      .from("pending_offpremises_checkins")
      .insert({
        user_id: user.id,
        current_location_name: location_name,
        latitude,
        longitude,
        accuracy,
        device_info: JSON.stringify(device_info),
        status: "pending",
        reason: reason,
        request_type: "off_premises_checkin",
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating off-premises request:", createError)
      return NextResponse.json(
        { error: "Failed to create request" },
        { status: 500 }
      )
    }

    // Send notification to supervisors
    // First, find the user's supervisor (typically the department head or manager)
    const { data: supervisors, error: supervisorError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("role", "departmental_head")
      .eq("departments", userProfile?.departments)
      .limit(1)

    if (supervisors && supervisors.length > 0) {
      const supervisorId = supervisors[0].id

      // Create notification for supervisor
      await supabase.from("staff_notifications").insert({
        user_id: supervisorId,
        title: `Off-Premises Check-In Request from ${userProfile.name}`,
        message: `${userProfile.name} has requested to check in from off-premises. Reason: ${reason}`,
        notification_type: "off_premises_request",
        related_request_id: offPremisesRequest.id,
        action_url: `/admin/pending-offpremises?request=${offPremisesRequest.id}`,
        is_read: false,
      })
    }

    // TODO: Send email notification to supervisor

    return NextResponse.json({
      success: true,
      data: offPremisesRequest,
      message: "Off-premises request submitted successfully",
    })
  } catch (error) {
    console.error("[v0] Off-premises request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's pending off-premises requests
    const { data: requests, error } = await supabase
      .from("pending_offpremises_checkins")
      .select(
        `
        id,
        user_id,
        current_location_name,
        latitude,
        longitude,
        accuracy,
        status,
        reason,
        approved_by_id,
        approved_at,
        rejection_reason,
        created_at,
        updated_at
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch requests" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching off-premises requests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
