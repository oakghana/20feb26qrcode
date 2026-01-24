import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const reason = formData.get("reason") as string
    const leaveType = formData.get("leaveType") as string

    if (!startDate || !endDate || !reason || !leaveType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update user profile to ACTIVATE LEAVE and mark staff as INACTIVE
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        leave_status: "active",
        is_active: false,
        leave_start_date: startDate,
        leave_end_date: endDate,
        leave_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: "Leave activated successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error activating leave:", error)
    return NextResponse.json({ error: error.message || "Failed to activate leave" }, { status: 500 })
  }
}
