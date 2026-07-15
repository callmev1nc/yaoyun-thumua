/** Vietnamese number / currency / date formatting helpers. */

const numberFmt = new Intl.NumberFormat("vi-VN")
const currencyFmt = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})

/** 8120000 -> "8.120.000" */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0"
  return numberFmt.format(n)
}

/** 8120000 -> "8.120.000 ₫" */
export function formatVND(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return currencyFmt.format(0)
  return currencyFmt.format(n)
}

/** Plain number with a trailing " đ" — used inside table cells. */
export function formatDong(n: number | null | undefined): string {
  return `${formatNumber(n)} đ`
}

/** "2026-07-15" | Date -> "15/07/2026". Empty/null -> "". */
export function formatDate(input: string | Date | null | undefined): string {
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
  return `${dd}/${mm}/${yyyy}`
}

/**
 * Parse a user-typed numeric string that may use Vietnamese conventions
 * (dot thousands separator, comma decimal). Returns NaN if unparseable.
 */
export function parseLooseNumber(raw: string): number {
  if (raw == null) return NaN
  const s = String(raw).trim().replace(/\s/g, "")
  if (s === "") return NaN
  // Treat the LAST ',' (or '.') as decimal sep following vi convention.
  const hasComma = s.includes(",")
  const hasDot = s.includes(".")
  let normalized = s.replace(/[^\d.,-]/g, "")
  if (hasComma && hasDot) {
    // dots = thousands, comma = decimal
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (hasDot) {
    const dots = (s.match(/\./g) || []).length
    const groups = s.split(".").map(g => g.length)
    // Single dot followed by exactly 3 digits → thousands separator (VND convention)
    if (dots === 1 && groups.length === 2 && groups[1] === 3) {
      normalized = normalized.replace(/\./g, "")
    } else if (dots > 1) {
      normalized = normalized.replace(/\./g, "")
    }
  }
  return Number(normalized)
}
