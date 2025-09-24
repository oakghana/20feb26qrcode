import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vgtajtqxgczhjboatvol.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzUyNDgsImV4cCI6MjA3MjU1MTI0OH0.EuuTCRC-rDoz_WHl4pwpV6_fEqrqcgGroa4nTjAEn1k"

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: !window.location.hostname.includes("vusercontent.net"),
      persistSession: !window.location.hostname.includes("vusercontent.net"),
      detectSessionInUrl: false,
      // Add error handling for refresh token failures
      onAuthStateChange: (event, session) => {
        if (event === "TOKEN_REFRESHED" && !session) {
          console.log("[v0] Token refresh failed, redirecting to login")
          // Clear any stale session data
          localStorage.removeItem("supabase.auth.token")
          // Redirect to login if we're not already there
          if (!window.location.pathname.startsWith("/auth")) {
            window.location.href = "/auth/login"
          }
        }
      },
    },
    global: {
      fetch: (url, options = {}) => {
        console.log("[v0] Supabase client fetch:", url)
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
        }).catch((error) => {
          console.error("[v0] Supabase client fetch error:", error)

          // Handle specific auth errors
          if (error.message?.includes("refresh_token_not_found") || error.message?.includes("Invalid Refresh Token")) {
            console.log("[v0] Refresh token error detected, clearing session")
            // Clear local storage and redirect to login
            localStorage.removeItem("supabase.auth.token")
            if (!window.location.pathname.startsWith("/auth")) {
              window.location.href = "/auth/login"
            }
          }

          throw error
        })
      },
    },
  })
}
