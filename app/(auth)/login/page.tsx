"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const loginEmail = email.trim().includes("@") ? email.trim() : `${email.trim()}@yaoyun.vn`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (error) {
      const map: Record<string, string> = {
        "Invalid login credentials": t("errInvalidCredentials"),
      }
      setError(map[error.message] ?? error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", data.user.id)
        .single()
      const lang = profile?.preferred_language ?? "zh-Hant"
      document.cookie = `locale=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    }

    const params = new URLSearchParams(window.location.search)
    let redirect = params.get("redirect") || "/"
    if (!redirect.startsWith("/") || redirect.startsWith("//")) {
      redirect = "/"
    }
    router.replace(redirect)
    router.refresh()
  }

  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-primary to-blue-700 p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Yaoyun" className="h-10 w-auto" />
          <span className="text-lg font-semibold">Yaoyun Thu Mua</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("systemTitle")}</h1>
          <p className="text-base text-white/70">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/50">{t("copyright")}</div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <img src="/logo.png" alt="Yaoyun" className="h-12 w-auto" />
            <h1 className="text-xl font-semibold">Yaoyun Thu Mua</h1>
            <p className="text-sm text-muted-foreground">{t("loginToContinue")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="text"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="email@yaoyun.vn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("signIn")}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <a href="mailto:admin@yaoyun.vn" className="underline hover:text-primary">
              {t("contactAdmin")}
            </a>
          </p>

          <div className="flex justify-center lg:hidden">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  )
}
