import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vgtajtqxgczhjboatvol.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzUyNDgsImV4cCI6MjA3MjU1MTI0OH0.EuuTCRC-rDoz_WHl4pwpV6_fEqrqcgGroa4nTjAEn1k"

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Disable automatic token refresh in preview environments to prevent network errors
      autoRefreshToken: !window.location.hostname.includes("vusercontent.net"),
      // Reduce session persistence issues in preview environments
      persistSession: !window.location.hostname.includes("vusercontent.net"),
      // Add retry configuration for network issues
      detectSessionInUrl: false,
    },
    global: {
      // Add custom fetch with error handling
      fetch: (url, options = {}) => {
        console.log("[v0] Supabase client fetch:", url)
        return fetch(url, {
          ...options,
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000),
        }).catch((error) => {
          console.error("[v0] Supabase client fetch error:", error)
          // Return a rejected promise to maintain error handling flow
          throw error
        })
      },
    },
  })
}
