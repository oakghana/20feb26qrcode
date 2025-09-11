import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Check three_test_users_info table
    const { data: testUser, error: testError } = await supabase
      .from("three_test_users_info")
      .select("email, password, role, full_name, staff_number, position, login_note")
      .eq("email", email)
      .single()

    if (testUser && !testError) {
      return NextResponse.json({
        found: true,
        source: "test_users",
        credentials: testUser,
      })
    }

    // Check unified_user_management table
    const { data: unifiedUser, error: unifiedError } = await supabase
      .from("unified_user_management")
      .select("email, role, full_name, employee_id, department_name, account_status, is_active")
      .eq("email", email)
      .single()

    if (unifiedUser && !unifiedError) {
      return NextResponse.json({
        found: true,
        source: "unified_management",
        credentials: {
          ...unifiedUser,
          note: "Password not stored in this table - use OTP login",
        },
      })
    }

    // Check user_profiles table
    const { data: profileUser, error: profileError } = await supabase
      .from("user_profiles")
      .select("email, role, first_name, last_name, employee_id, position, is_active")
      .eq("email", email)
      .single()

    if (profileUser && !profileError) {
      return NextResponse.json({
        found: true,
        source: "user_profiles",
        credentials: {
          ...profileUser,
          full_name: `${profileUser.first_name} ${profileUser.last_name}`,
          note: "Password not stored in this table - use OTP login",
        },
      })
    }

    return NextResponse.json({
      found: false,
      message: "User not found in any table",
    })
  } catch (error) {
    console.error("Error fetching user credentials:", error)
    return NextResponse.json({ error: "Failed to fetch user credentials" }, { status: 500 })
  }
}
