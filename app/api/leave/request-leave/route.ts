import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { start_date, end_date, reason, leave_type } = await request.json()

    // Create leave request
    const { data: leaveRequest, error: requestError } = await supabase
      .from("leave_requests")
      .insert({
        user_id: user.id,
        start_date,
        end_date,
        reason,
        leave_type,
        status: "pending",
      })
      .select()
      .single()

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 400 })
    }

    // Create notification for the leave request
    const { error: notificationError } = await supabase
      .from("leave_notifications")
      .insert({
        leave_request_id: leaveRequest.id,
        user_id: user.id,
        notification_type: "leave_request",
        status: "pending",
      })

    if (notificationError) {
      return NextResponse.json({ error: notificationError.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        message: "Leave request submitted successfully",
        leaveRequest,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
