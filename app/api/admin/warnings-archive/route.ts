import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "it-admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Fetch all warnings with joined user and department data
    const { data: warnings, error } = await supabase
      .from("staff_warnings")
      .select(`
        *,
        issued_to_profile:user_profiles!staff_warnings_issued_to_fkey(
          first_name,
          last_name,
          email,
          employee_id,
          departments(name)
        ),
        issued_by_profile:user_profiles!staff_warnings_issued_by_fkey(
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Format the warnings data
    const formattedWarnings = warnings.map((warning: any) => ({
      id: warning.id,
      issued_to_name: `${warning.issued_to_profile.first_name} ${warning.issued_to_profile.last_name}`,
      issued_to_email: warning.issued_to_profile.email,
      issued_to_employee_id: warning.issued_to_profile.employee_id,
      issued_by_name: `${warning.issued_by_profile.first_name} ${warning.issued_by_profile.last_name}`,
      sender_label: warning.sender_label || "Department Head",
      warning_type: warning.warning_type,
      warning_message: warning.warning_message,
      attendance_date: warning.attendance_date,
      created_at: warning.created_at,
      is_read: warning.is_read,
      department_name: warning.issued_to_profile.departments?.name || "N/A",
    }))

    return NextResponse.json({ warnings: formattedWarnings })
  } catch (error) {
    console.error("Error fetching warnings archive:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
