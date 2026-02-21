import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: "off_premises_request" | "off_premises_approved" | "off_premises_rejected"
  relatedRequestId?: string
  actionUrl?: string
}

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
    const { userId, title, message, type, relatedRequestId, actionUrl } =
      body as NotificationPayload

    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create notification record
    const { data: notification, error: createError } = await supabase
      .from("staff_notifications")
      .insert({
        user_id: userId,
        title,
        message,
        notification_type: type,
        related_request_id: relatedRequestId,
        action_url: actionUrl,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating notification:", createError)
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      )
    }

    // TODO: Send push notification or email notification here
    // This would integrate with a push notification service or email service

    return NextResponse.json({
      success: true,
      data: notification,
      message: "Notification sent successfully",
    })
  } catch (error) {
    console.error("[v0] Error in notifications endpoint:", error)
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    // Get user's notifications
    let query = supabase
      .from("staff_notifications")
      .select("*")
      .eq("user_id", user.id)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data: notifications, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notifications || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
