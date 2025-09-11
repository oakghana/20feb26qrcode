import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Test users API called")

    const supabase = createClient()

    if (!supabase) {
      console.error("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    console.log("[v0] Supabase client created, fetching test users")

    const { data: testUsers, error } = await supabase.from("three_test_users_info").select("*").order("role")

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch test users",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Test users fetched successfully:", testUsers?.length || 0, "users")

    const fallbackUsers = [
      {
        email: "ohemengappiah@qccgh.com",
        password: "password123",
        role: "admin",
        full_name: "Mr Kwaku Appiah Ohemeng",
        staff_number: "QCC001",
        position: "Administrator",
        login_note: "Default admin account",
      },
      {
        email: "info@qccgh.com",
        password: "password123",
        role: "staff",
        full_name: "Test Staff User",
        staff_number: "QCC002",
        position: "Staff Member",
        login_note: "Test staff account",
      },
    ]

    const users = testUsers && testUsers.length > 0 ? testUsers : fallbackUsers

    return NextResponse.json({
      users: users,
      message: "Test users retrieved successfully",
      source: testUsers && testUsers.length > 0 ? "database" : "fallback",
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
