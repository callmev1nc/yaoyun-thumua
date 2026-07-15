import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

/**
 * Refresh the Supabase auth session on every matched request and return the
 * updated response. Run this from `proxy.ts` (Next 16 renamed middleware→proxy).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: don't run auth logic between a server action and its response.
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return response
  }

  // Refresh session. getUser() touches the session and writes refreshed cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect app routes: redirect unauthenticated users to /login.
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login")

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Send logged-in users away from auth pages.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.delete("redirect")
    return NextResponse.redirect(url)
  }

  return response
}
