/**
 * Central money/calculation logic for the whole app.
 *
 * IMPORTANT: these formulas MUST mirror the Postgres GENERATED columns in
 * `supabase/migrations/0001_init.sql` so the live form preview matches what
 * the database stores. If you change one, change the other.
 *
 * Rule: no discount.
 *   net_before_vat = gross
 *   vat            = net_before_vat * vat_rate
 *   line_total     = net_before_vat + vat
 */

/** Round to whole VND (no sub-unit currency in Vietnam). */
export function vnd(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}

export interface LineInput {
  quantity: number
  unit_price: number
  vat_rate: number // 8 | 10
}

/** Thành tiền (gross) = quantity × unit_price. */
export function lineGross(i: LineInput): number {
  return vnd((Number(i.quantity) || 0) * (Number(i.unit_price) || 0))
}

/** Còn lại / base chịu thuế = gross (no discount). */
export function netBeforeVat(i: LineInput): number {
  return lineGross(i)
}

/** Tiền VAT của dòng = net_before_vat × vat_rate. */
export function lineVat(i: LineInput): number {
  return vnd(netBeforeVat(i) * ((Number(i.vat_rate) || 0) / 100))
}

/** Tổng dòng (gồm VAT) = net_before_vat + vat. */
export function lineTotal(i: LineInput): number {
  return vnd(netBeforeVat(i) + lineVat(i))
}

export interface OrderTotals {
  grossTotal: number // Σ thành tiền
  subtotalExVat: number // Tổng chưa thuế
  vatTotal: number // Tiền thuế
  grandTotal: number // Tổng gồm thuế
  needToPayPreVat: number // Σ còn lại
}

/** Roll up many lines into the order totals shown on Form 1 / Form 3. */
export function orderTotals(items: LineInput[]): OrderTotals {
  return items.reduce<OrderTotals>(
    (acc, i) => {
      acc.grossTotal += lineGross(i)
      acc.subtotalExVat += netBeforeVat(i)
      acc.vatTotal += lineVat(i)
      acc.grandTotal += lineTotal(i)
      acc.needToPayPreVat += netBeforeVat(i)
      return acc
    },
    {
      grossTotal: 0,
      subtotalExVat: 0,
      vatTotal: 0,
      grandTotal: 0,
      needToPayPreVat: 0,
    },
  )
}

/** Số tiền một đợt thanh toán = grand_total × percent. */
export function installmentAmount(grandTotal: number, percent: number): number {
  return vnd((Number(grandTotal) || 0) * ((Number(percent) || 0) / 100))
}

/**
 * Remaining quantity to deliver for a line.
 *   remaining = ordered − Σ(delivered across all delivery notes of the order)
 */
export function remainingQty(ordered: number, deliveredTotal: number): number {
  return vnd((Number(ordered) || 0) - (Number(deliveredTotal) || 0))
}

/** VAT rate choices exposed in the UI. */
export const VAT_RATES = [8, 10] as const
export type VatRate = (typeof VAT_RATES)[number]
