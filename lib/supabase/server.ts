import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  try {
    console.log("[v0] Creating Supabase server client")

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("[v0] Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        nextPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        regularUrl: !!process.env.SUPABASE_URL,
        nextPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        regularKey: !!process.env.SUPABASE_ANON_KEY,
      })
      throw new Error("Missing Supabase environment variables")
    }

    const cookieStore = await cookies()

    const client = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })

    console.log("[v0] Supabase server client created successfully")
    return client
  } catch (error) {
    console.error("[v0] Failed to create Supabase server client:", error)
    throw error
  }
}
