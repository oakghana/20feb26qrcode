import { createClient } from "@/lib/supabase/server"
import { emailService } from "@/lib/email-service"
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

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { type, recipients, data } = await request.json()

    let results = []

    switch (type) {
      case "attendance_reminder":
        results = await sendAttendanceReminders(recipients, data)
        break
      case "weekly_report":
        results = await sendWeeklyReports(recipients, data)
        break
      case "password_reset":
        results = await sendPasswordResetEmails(recipients, data)
        break
      default:
        return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }

    // Log notification activity
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "send_notifications",
      table_name: "notifications",
      details: { type, recipient_count: recipients.length, results },
    })

    return NextResponse.json({
      success: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    console.error("Notification API error:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}

async function sendAttendanceReminders(recipients: any[], data: any) {
  const results = []

  for (const recipient of recipients) {
    try {
      const result = await emailService.sendEmail(
        recipient.email,
        emailService.constructor.templates.attendanceReminder,
        {
          firstName: recipient.first_name,
          scheduledTime: data.scheduledTime || "9:00 AM",
          location: data.location || "Your assigned location",
        },
      )
      results.push({ email: recipient.email, ...result })
    } catch (error) {
      results.push({ email: recipient.email, success: false, error: error.message })
    }
  }

  return results
}

async function sendWeeklyReports(recipients: any[], data: any) {
  const results = []

  for (const recipient of recipients) {
    try {
      const result = await emailService.sendEmail(recipient.email, emailService.constructor.templates.weeklyReport, {
        firstName: recipient.first_name,
        weekOf: data.weekOf,
        totalHours: data.totalHours || "0",
        daysPresent: data.daysPresent || "0",
        daysAbsent: data.daysAbsent || "0",
        lateCheckins: data.lateCheckins || "0",
      })
      results.push({ email: recipient.email, ...result })
    } catch (error) {
      results.push({ email: recipient.email, success: false, error: error.message })
    }
  }

  return results
}

async function sendPasswordResetEmails(recipients: any[], data: any) {
  const results = []

  for (const recipient of recipients) {
    try {
      const result = await emailService.sendEmail(recipient.email, emailService.constructor.templates.passwordReset, {
        firstName: recipient.first_name,
        tempPassword: data.tempPassword || "TempPass123!",
      })
      results.push({ email: recipient.email, ...result })
    } catch (error) {
      results.push({ email: recipient.email, success: false, error: error.message })
    }
  }

  return results
}
