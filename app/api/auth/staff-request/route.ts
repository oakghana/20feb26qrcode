import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const headers = {
    "Cache-Control": "no-cache, no-store, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  }

  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, employeeId, position, departmentId, password } = body

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        employee_id: employeeId,
        position: position,
        phone: phone,
        department_id: departmentId,
      },
    })

    if (authError) {
      console.error("Auth creation error:", authError)
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 400, headers },
      )
    }

    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone || null,
      employee_id: employeeId || null,
      position: position || null,
      department_id: departmentId || null,
      role: "staff",
      is_active: false, // Still requires admin approval
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500, headers })
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: authData.user.id,
      action: "staff_registration_completed",
      table_name: "user_profiles",
      record_id: authData.user.id,
      new_values: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        status: "pending_approval",
        email_verified: true, // Mark as verified since we skip verification
      },
      created_at: new Date().toISOString(),
    })

    if (auditError) {
      console.error("Audit log error:", auditError)
    }

    return NextResponse.json(
      {
        message: "Registration completed successfully. Please wait for admin approval.",
        userId: authData.user.id,
      },
      { headers },
    )
  } catch (error) {
    console.error("Staff registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers })
  }
}
