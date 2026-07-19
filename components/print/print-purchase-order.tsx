"use client";

import { useEffect } from "react";
import type { PurchaseOrder, OrderItem, PaymentSchedule } from "@/types/db";
import { formatNumber, formatDong, formatDate } from "@/lib/number-format";
import type { Locale } from "@/i18n/request";

export function PrintPurchaseOrder({
  order,
  items,
  payments,
  tCn,
  tVn,
  locale,
}: {
  order: PurchaseOrder;
  items: OrderItem[];
  payments: PaymentSchedule[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tCn: (key: string, values?: Record<string, any>) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tVn: (key: string, values?: Record<string, any>) => string;
  locale: Locale;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  const rates = Array.from(new Set(items.map((i) => i.vat_rate)));
  const vatLabel = rates.length === 1 ? `VAT${rates[0]}%` : "VAT";
  const payText =
    payments.length > 0
      ? payments
          .map(
            (p, i) =>
              `${tVn("installment")} ${i + 1}: ${formatNumber(p.percent, locale)}%${p.planned_date ? ` (${formatDate(p.planned_date, locale)})` : ""}${p.status === "paid" ? " ✓" : ""}`,
          )
          .join(" · ")
      : "—";

  return (
    <div className="print-page">
      <div className="pp-inner">
        <div className="pp-header">
          <img src="/forms/logo.png" alt={tCn("logoAlt")} className="pp-logo" />
          <div className="pp-company">
            <div className="pp-cn">{tCn("company")}</div>
            <div>{tVn("company")}</div>
          </div>
          <div className="pp-title">
            <div className="pp-title-cn">{tCn("po.title")}</div>
            <div className="pp-title-vn">{tVn("po.title")}</div>
          </div>
        </div>

        <table className="pp-info">
          <tbody>
            <InfoRow
              l1={tCn("supplierInfo")}
              v1={order.supplier_company ?? ""}
              l2={tCn("code")}
              v2={order.order_code}
            />
            <InfoRow
              l1={tCn("info.projectCode")}
              v1={order.project_code ?? ""}
              l2={tCn("info.orderCode")}
              v2={order.po_code ?? ""}
            />
            <InfoRow
              l1={tCn("info.owner")}
              v1={order.supplier_contact ?? ""}
              l2={tCn("info.phone")}
              v2={order.supplier_phone ?? ""}
            />
            <InfoRow
              l1={tCn("buyer")}
              v1={order.buyer_name ?? ""}
              l2={tCn("info.phone")}
              v2={order.buyer_phone ?? ""}
            />
            <InfoRow
              l1={tCn("info.receiver")}
              v1={order.receiver_name ?? ""}
              l2={tCn("info.phone")}
              v2={order.receiver_phone ?? ""}
            />
            <tr>
              <td className="pp-label">{tCn("deliveryAddress")}</td>
              <td className="pp-val" colSpan={3}>
                {order.receiver_address ?? ""}
              </td>
            </tr>
            <tr>
              <td className="pp-label">{tCn("paymentMethod")}</td>
              <td className="pp-val" colSpan={3}>
                {payText}
              </td>
            </tr>
            <tr>
              <td className="pp-label">{tCn("info.deliveryDate")}</td>
              <td className="pp-val" colSpan={3}>
                {formatDate(order.delivery_date, locale)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="pp-items">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>{tCn("col.no")}<br />{tVn("col.no")}</th>
              <th style={{ width: "30%" }}>{tCn("col.product")} / {tVn("col.product")}</th>
              <th style={{ width: "8%" }}>{tCn("col.unit")}<br />{tVn("col.unit")}</th>
              <th style={{ width: "10%" }}>{tCn("col.qty")}<br />{tVn("col.qty")}</th>
              <th style={{ width: "14%" }}>{tCn("col.unitPrice")}<br />{tVn("col.unitPrice")}</th>
              <th style={{ width: "18%" }}>{tCn("col.subtotal")}<br />{tVn("col.subtotal")}</th>
              <th style={{ width: "15%" }}>{tCn("col.vat")}<br />{tVn("col.vat")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="center">{it.seq}</td>
                <td>{it.product_name}</td>
                <td className="center">{it.unit ?? ""}</td>
                <td className="right">{formatNumber(it.quantity, locale)}</td>
                <td className="right">{formatNumber(it.unit_price, locale)}</td>
                <td className="right">{formatNumber(it.net_before_vat, locale)}</td>
                <td className="right">{formatNumber(it.line_vat, locale)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <tr key={`pad${i}`} className="pp-pad">
                <td>&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="pp-totals">
          <tbody>
            <tr>
              <td className="pp-tot-label">{tCn("totalExclVat")} / {tVn("totalExclVat")}</td>
              <td className="pp-tot-val">{formatDong(order.subtotal_ex_vat, locale)}</td>
            </tr>
            <tr>
              <td className="pp-tot-label">{vatLabel} {tCn("col.vat")} / {tVn("col.vat")}</td>
              <td className="pp-tot-val">{formatDong(order.vat_total, locale)}</td>
            </tr>
            <tr>
              <td className="pp-tot-label bold">{tCn("totalInclVat")} / {tVn("totalInclVat")}</td>
              <td className="pp-tot-val bold">{formatDong(order.grand_total, locale)}</td>
            </tr>
          </tbody>
        </table>

        <div className="pp-terms">
          <div className="pp-terms-title">{tCn("po.reg1")}</div>
          <div className="pp-terms-grid">
            <div>
              <b>{tVn("po.reg2")}</b>
              <p>{tVn("po.reg3")}</p>
            </div>
          </div>
        </div>

        <div className="pp-sign">
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.manager")} · {tVn("sig.manager")}</div>
            <div className="pp-sign-line" />
          </div>
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.buyer")} · {tVn("sig.buyer")}</div>
            <div className="pp-sign-line">{order.buyer_name ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  l1,
  v1,
  l2,
  v2,
}: {
  l1: string;
  v1: string;
  l2: string;
  v2: string;
}) {
  return (
    <tr>
      <td className="pp-label">{l1}</td>
      <td className="pp-val">{v1}</td>
      <td className="pp-label">{l2}</td>
      <td className="pp-val">{v2}</td>
    </tr>
  );
}
