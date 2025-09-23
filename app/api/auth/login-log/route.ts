import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Login activity logging API called")

    let body
    try {
      body = await request.json()
      console.log("[v0] Request body parsed:", {
        hasUserId: !!body.user_id,
        action: body.action,
        success: body.success,
        method: body.method,
      })
    } catch (parseError) {
      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { user_id, action, success, method, user_agent } = body

    // Validate required fields
    if (!user_id || !action || typeof success !== "boolean" || !method) {
      console.error("[v0] Missing required fields:", { user_id, action, success, method })
      return NextResponse.json(
        {
          error: "Missing required fields: user_id, action, success, method",
        },
        { status: 400 },
      )
    }

    let supabase
    try {
      supabase = await createClient()
      console.log("[v0] Supabase client created successfully")
    } catch (clientError) {
      console.error("[v0] Failed to create Supabase client:", clientError)
      return NextResponse.json(
        {
          error: "Database connection failed",
        },
        { status: 500 },
      )
    }

    const auditLogData = {
      user_id,
      action,
      table_name: "auth_sessions",
      new_values: {
        success,
        method,
        timestamp: new Date().toISOString(),
        user_agent: user_agent || request.headers.get("user-agent"),
      },
      ip_address: request.ip || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      user_agent: user_agent || request.headers.get("user-agent"),
    }

    console.log("[v0] Inserting audit log:", {
      user_id,
      action,
      success,
      method,
      hasIpAddress: !!auditLogData.ip_address,
      hasUserAgent: !!auditLogData.user_agent,
    })

    // Log the login activity
    const { data, error } = await supabase.from("audit_logs").insert(auditLogData).select()

    if (error) {
      console.error("[v0] Failed to insert audit log:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        data: auditLogData,
      })
      return NextResponse.json(
        {
          error: "Failed to log activity",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Audit log inserted successfully:", data)
    return NextResponse.json({ success: true, logged: true })
  } catch (error) {
    console.error("[v0] Login logging error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
