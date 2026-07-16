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
     * - static files served from /public at the root (logo.png, icon.png,
     *   forms/*, fonts, …) — these must load on /login while unauthenticated,
     *   otherwise the auth guard redirects the image request to /login HTML
     *   and the <img> renders broken
     * - the auth callback (handled separately to avoid redirect loops)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth/callback|.*\\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|otf|txt|webmanifest)).*)",
  ],
}
