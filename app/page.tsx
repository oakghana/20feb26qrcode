import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect("/dashboard")
    } else {
      redirect("/auth/login")
    }
  } catch (error) {
    // If Supabase client creation fails (e.g., missing env vars), redirect to login
    console.error("[v0] Failed to create Supabase client on home page:", error)
    redirect("/auth/login")
  }
}
