import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Missing Supabase environment variables - allowing request without auth")
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: undefined,
          })
        },
      },
    })

    // Just refresh the session to update cookies, don't enforce auth here
    // Let individual pages handle auth checks instead
    await supabase.auth.getUser()

    return supabaseResponse
  } catch (error: any) {
    if (error.name !== "AbortError" && process.env.NODE_ENV === "development") {
      console.error("[v0] Middleware error:", error)
    }
    return NextResponse.next({
      request,
    })
  }
}
