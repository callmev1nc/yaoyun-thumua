import type { Locale } from "@/i18n/request";

export function formatNumber(n: number | null | undefined, locale: Locale = "zh-Hant"): string {
  if (n == null || !Number.isFinite(n)) return "0"
  return new Intl.NumberFormat(locale).format(n)
}

export function formatVND(n: number | null | undefined, locale: Locale = "zh-Hant"): string {
  if (n == null || !Number.isFinite(n)) return formatDong(0, locale)
  return formatDong(n, locale)
}

export function formatDong(n: number | null | undefined, locale: Locale = "zh-Hant"): string {
  return `${formatNumber(n, locale)} ₫`
}

export function formatDate(input: string | Date | null | undefined, locale: Locale = "zh-Hant"): string {
  if (!input) return ""
  let d: Date
  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, day] = input.split("-").map(Number)
      d = new Date(y, m - 1, day)
    } else {
      d = new Date(input)
    }
  } else {
    d = input
  }
  if (Number.isNaN(d.getTime())) return ""
  if (locale === "vi") {
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${dd}/${mm}/${d.getFullYear()}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

/** Print-only date: zero-padded YYYY年MM月DD日 (CN locales) or DD/MM/YYYY (vi). */
export function formatFormDate(input: string | Date | null | undefined, locale: Locale = "zh-Hant"): string {
  if (!input) return ""
  let d: Date
  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, day] = input.split("-").map(Number)
      d = new Date(y, m - 1, day)
    } else {
      d = new Date(input)
    }
  } else {
    d = input
  }
  if (Number.isNaN(d.getTime())) return ""
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  if (locale === "vi") return `${dd}/${mm}/${yyyy}`
  return `${yyyy}年${mm}月${dd}日`
}

export function parseLooseNumber(raw: string, locale: Locale = "zh-Hant"): number {
  if (raw == null) return NaN
  const s = String(raw).trim().replace(/\s/g, "")
  if (s === "") return NaN
  if (locale === "vi") {
    const normalized = s.replace(/\./g, "").replace(",", ".")
    return Number(normalized) || 0
  }
  const normalized = s.replace(/,/g, "")
  return Number(normalized) || 0
}
