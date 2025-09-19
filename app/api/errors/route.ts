import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()
    const supabase = createClient()

    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    }

    // Get current user if available
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Log error to database
    const { error } = await supabase.from("error_logs").insert({
      message: errorData.message,
      stack: errorData.stack,
      component_stack: errorData.componentStack,
      user_agent: errorData.userAgent,
      url: errorData.url,
      event_id: errorData.eventId,
      user_id: user?.id,
      timestamp: errorData.timestamp,
      severity: "error",
    })

    if (error) {
      console.error("Failed to log error to database:", error)
    }

    // In production, you might want to send to external monitoring service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to Sentry, LogRocket, etc.
      console.error("Application Error:", errorData)
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    console.error("Error logging endpoint failed:", error)
    return NextResponse.json(
      { error: "Failed to log error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate, private",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  }
}
