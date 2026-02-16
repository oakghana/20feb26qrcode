import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] HomePage: Auth check", { userId: user?.id, userEmail: user?.email })

    if (user) {
      // OPTIMIZATION: Direct staff to Attendance page for faster check-in/check-out
      // Reduces friction and improves adoption
      console.log("[v0] HomePage: User authenticated, redirecting to attendance")
      redirect("/dashboard/attendance")
    } else {
      console.log("[v0] HomePage: No user, redirecting to login")
      redirect("/auth/login")
    }
  } catch (error) {
    console.error("[v0] HomePage: Auth error:", error)
    // If there's an error, redirect to login
    redirect("/auth/login")
  }
}
