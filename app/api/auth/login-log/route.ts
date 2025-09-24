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
          details: clientError instanceof Error ? clientError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    const getValidIpAddress = () => {
      const possibleIps = [
        request.ip,
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        request.headers.get("x-real-ip"),
        request.headers.get("cf-connecting-ip"),
        request.headers.get("x-client-ip"),
      ]

      for (const ip of possibleIps) {
        if (ip && ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
          // Validate IP format (basic check)
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip)) {
            return ip
          }
        }
      }

      // Return null instead of "unknown" to avoid PostgreSQL inet type error
      return null
    }

    const validIpAddress = getValidIpAddress()

    const auditLogData = {
      user_id,
      action,
      table_name: "auth_sessions",
      new_values: {
        success,
        method,
        timestamp: new Date().toISOString(),
        user_agent: user_agent || request.headers.get("user-agent") || "unknown",
      },
      ip_address: validIpAddress, // This will be null if no valid IP is found
      user_agent: user_agent || request.headers.get("user-agent") || "unknown",
    }

    console.log("[v0] Inserting audit log:", {
      user_id,
      action,
      success,
      method,
      hasIpAddress: !!auditLogData.ip_address,
      hasUserAgent: !!auditLogData.user_agent,
    })

    try {
      const { data, error } = (await Promise.race([
        supabase.from("audit_logs").insert(auditLogData).select(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database operation timeout")), 10000)),
      ])) as any

      if (error) {
        console.error("[v0] Failed to insert audit log:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          data: auditLogData,
        })

        console.log("[v0] Audit logging failed but allowing login to continue")
        return NextResponse.json({
          success: true,
          logged: false,
          warning: "Login successful but activity logging failed",
        })
      }

      console.log("[v0] Audit log inserted successfully:", data)
      return NextResponse.json({ success: true, logged: true })
    } catch (dbError) {
      console.error("[v0] Database operation failed:", dbError)
      return NextResponse.json({
        success: true,
        logged: false,
        warning: "Login successful but activity logging failed",
      })
    }
  } catch (error) {
    console.error("[v0] Login logging error:", error)
    return NextResponse.json(
      {
        success: true,
        logged: false,
        warning: "Login successful but activity logging failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }, // Changed from 500 to 200 to prevent fetch failures
    )
  }
}
