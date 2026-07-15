import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/**
 * Next.js 16 renamed `middleware.ts` → `proxy.ts`. Runs before every matched
 * route: refreshes the Supabase session and guards app routes.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run proxy on everything except:
     * - _next/static, _next/image (framework assets)
     * - favicon.ico, sitemap, robots
     * - the auth callback (handled separately to avoid redirect loops)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth/callback).*)",
  ],
}
