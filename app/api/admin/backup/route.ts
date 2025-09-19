import { createClient } from "@/lib/supabase/server"
import { backupService } from "@/lib/backup-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role, email").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { action, config } = await request.json()

    if (action === "create") {
      const backupConfig = {
        frequency: config?.frequency || "daily",
        retentionDays: config?.retentionDays || 30,
        includeAuditLogs: config?.includeAuditLogs ?? true,
        notifyOnCompletion: config?.notifyOnCompletion ?? true,
        adminEmails: config?.adminEmails || [profile.email],
      }

      const result = await backupService.createBackup(backupConfig)

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    if (action === "schedule") {
      const backupConfig = {
        frequency: config?.frequency || "daily",
        retentionDays: config?.retentionDays || 30,
        includeAuditLogs: config?.includeAuditLogs ?? true,
        notifyOnCompletion: config?.notifyOnCompletion ?? true,
        adminEmails: config?.adminEmails || [profile.email],
      }

      const result = await backupService.scheduleBackup(backupConfig)

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Backup API error:", error)
    return NextResponse.json({ error: "Backup operation failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const backupHistory = await backupService.getBackupHistory()

    return NextResponse.json(
      { backups: backupHistory },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("Backup history API error:", error)
    return NextResponse.json({ error: "Failed to get backup history" }, { status: 500 })
  }
}
