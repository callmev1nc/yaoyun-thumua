import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PKCE auth callback (email confirmation links / magic links / OAuth).
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirectParam = requestUrl.searchParams.get("redirect") || "/"

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(requestUrl.origin + redirectParam)
}
