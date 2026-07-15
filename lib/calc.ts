/**
 * Central money/calculation logic for the whole app.
 *
 * IMPORTANT: these formulas MUST mirror the Postgres GENERATED columns in
 * `supabase/migrations/0001_init.sql` so the live form preview matches what
 * the database stores. If you change one, change the other.
 *
 * Rule (decision): discount reduces the VAT-able base.
 *   net_before_vat = gross - discount
 *   vat            = net_before_vat * vat_rate
 *   line_total     = net_before_vat + vat
 * The original Form 1 sample (8.120.000 × 8% = 649.600) matches when discount = 0.
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
  discount_percent: number // 0..100
}

/** Thành tiền (gross) = quantity × unit_price. */
export function lineGross(i: LineInput): number {
  return vnd((Number(i.quantity) || 0) * (Number(i.unit_price) || 0))
}

/** Tiền chiết khấu = gross × discount%. */
export function discountAmount(i: LineInput): number {
  return vnd(lineGross(i) * ((Number(i.discount_percent) || 0) / 100))
}

/** Còn lại / base chịu thuế = gross − discount. */
export function netBeforeVat(i: LineInput): number {
  return vnd(lineGross(i) - discountAmount(i))
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
  grossTotal: number // Σ thành tiền (Form 3 "SUM")
  discountTotal: number // Σ tiền chiết khấu
  subtotalExVat: number // Tổng chưa thuế (sau CK) — Form 1 "總價 (未稅)"
  vatTotal: number // Tiền thuế — Form 1 "VAT… 為"
  grandTotal: number // Tổng gồm thuế — Form 1 "總價 (已含稅)"
  needToPayPreVat: number // Σ còn lại — Form 3 "SỐ TIỀN CẦN CHI"
}

/** Roll up many lines into the order totals shown on Form 1 / Form 3. */
export function orderTotals(items: LineInput[]): OrderTotals {
  return items.reduce<OrderTotals>(
    (acc, i) => {
      acc.grossTotal += lineGross(i)
      acc.discountTotal += discountAmount(i)
      acc.subtotalExVat += netBeforeVat(i)
      acc.vatTotal += lineVat(i)
      acc.grandTotal += lineTotal(i)
      acc.needToPayPreVat += netBeforeVat(i)
      return acc
    },
    {
      grossTotal: 0,
      discountTotal: 0,
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
