import { redirect } from "next/navigation"
import { createClient } from "./supabase/server"
import type { Profile, UserRole } from "@/types/db"

export interface AuthContext {
  user: { id: string; email?: string | null }
  profile: Profile | null
  role: UserRole
}

/** Current session + profile, or null if not logged in. */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return {
    user: { id: user.id, email: user.email },
    profile: (profile as Profile | null) ?? null,
    role: (profile as Profile | null)?.role ?? "staff",
  }
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(redirectTo?: string): Promise<AuthContext> {
  const ctx = await getCurrentUser()
  if (!ctx?.user) {
    const dest = redirectTo ?? "/"
    redirect(`/login?redirect=${encodeURIComponent(dest)}`)
  }
  return ctx
}

/** Require an admin; otherwise bounce to /. */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser()
  if (ctx.role !== "admin") redirect("/")
  return ctx
}
