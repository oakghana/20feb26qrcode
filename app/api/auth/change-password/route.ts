import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { rateLimit, getClientIdentifier, validatePassword, createSecurityHeaders } from "@/lib/security"

export async function POST(request: NextRequest) {
  const headers = createSecurityHeaders()

  try {
    const clientId = getClientIdentifier(request)
    const isAllowed = rateLimit(clientId, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 3, // Max 3 password change attempts per 15 minutes
    })

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many password change attempts. Please try again later." },
        { status: 429, headers },
      )
    }

    const supabase = await createClient()
    const { currentPassword, newPassword } = await request.json()

    if (!newPassword) {
      return NextResponse.json({ error: "New password is required" }, { status: 400, headers })
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: "Password requirements not met", details: passwordValidation.errors },
        { status: 400, headers },
      )
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers })
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400, headers })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error("Password update error:", updateError)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500, headers })
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "password_changed",
      table_name: "auth.users",
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully",
      },
      { headers },
    )
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers })
  }
}
