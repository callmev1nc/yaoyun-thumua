"use client";

import { useEffect } from "react";
import type { PurchaseOrder, OrderItem, PaymentSchedule } from "@/types/db";
import { formatNumber, formatFormDate } from "@/lib/number-format";
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
  const vatRate = rates[0] ?? 8;
  const payText =
    payments.length > 0
      ? payments
          .map(
            (p, i) =>
              `${tVn("installment")} ${i + 1}: ${formatNumber(p.percent, "vi")}%${p.planned_date ? ` (${formatFormDate(p.planned_date, "vi")})` : ""}${p.status === "paid" ? " ✓" : ""}`,
          )
          .join(" · ")
      : "—";

  const money = (n: number | null | undefined) => `(${formatNumber(n, "vi")})`;
  const projectName = order.customer_company ?? "";

  return (
    <div className="print-page">
      <div className="pp-inner pp-form pp-form1">
        <div className="pp-header">
          <img src="/forms/logo.png" alt={tCn("logoAlt")} className="pp-logo" />
          <div className="pp-company">
            <div className="pp-cn">{tCn("company")}</div>
            <div className="pp-company-vn">{tVn("company")}</div>
          </div>
        </div>

        <div className="pp-topbar">
          <span>{tCn("info.poCode")} {tVn("info.poCode")}: {order.po_code ?? ""}</span>
          <span>{tCn("info.purchaseDate")} {tVn("info.purchaseDate")}: {formatFormDate(order.created_at, locale)}</span>
        </div>

        <div className="pp-title-center">
          <div className="pp-title-cn">{tCn("po.title")}</div>
          <div className="pp-title-vn">{tVn("po.title")}</div>
        </div>

        <div className="pp-info2">
          <div className="pp-info2-left">
            <Field label={`${tCn("info.supplierInfo")} ${tVn("info.supplierInfo")}`} value={order.supplier_company ?? ""} />
            <Field label={`${tCn("info.supplierContact")} ${tVn("info.supplierContact")}`} value={order.supplier_contact ?? ""} />
            <Field label={`${tCn("buyer")} ${tVn("buyer")}`} value={order.buyer_name ?? ""} />
            <Field label={`${tCn("info.receiver")} ${tVn("info.receiver")}`} value={order.receiver_name ?? ""} />
            <Field label={`${tCn("info.receiverAddress")} ${tVn("info.receiverAddress")}`} value={order.receiver_address ?? ""} multiline />
          </div>
          <div className="pp-info2-right">
            <Inline label={`${tCn("info.projectCode")} ${tVn("info.projectCode")}`} value={projectName ? `${order.project_code ?? ""} (${projectName})` : (order.project_code ?? "")} />
            <Inline label={`${tCn("info.supplierPhone")} ${tVn("info.supplierPhone")}`} value={order.supplier_phone ?? ""} />
            <Inline label={`${tCn("info.phone")} ${tVn("info.phone")}`} value={order.buyer_phone ?? ""} />
            <Inline label={`${tCn("info.phone")} ${tVn("info.phone")}`} value={order.receiver_phone ?? ""} />
            <Inline label={`${tCn("info.deliveryTime")} ${tVn("info.deliveryTime")}`} value={formatFormDate(order.delivery_date, locale)} />
          </div>
        </div>

        <div className="pp-payline">
          <span className="lbl">{tCn("paymentMethod")} {tVn("paymentMethod")}</span>
          <span className="val">{payText}</span>
        </div>

        <table className="pp-items">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>{tCn("col.no")}{tVn("col.no")}</th>
              <th style={{ width: "33%" }}>{tCn("col.product")} {tVn("col.product")}</th>
              <th style={{ width: "8%" }}>{tCn("col.unit")} {tVn("col.unit")}</th>
              <th style={{ width: "9%" }}>{tCn("col.qty")} {tVn("col.qty")}</th>
              <th style={{ width: "13%" }}>{tCn("col.unitPrice")} {tVn("col.unitPrice")}</th>
              <th style={{ width: "17%" }}>{tCn("col.subtotal")} {tVn("col.subtotal")}</th>
              <th style={{ width: "15%" }}>{tCn("col.vat")} {tVn("col.vat")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="center">{it.seq}</td>
                <td>{it.product_name}</td>
                <td className="center">{it.unit ?? ""}</td>
                <td className="right">{formatNumber(it.quantity, "vi")}</td>
                <td className="right">{formatNumber(it.unit_price, "vi")}</td>
                <td className="right">{formatNumber(it.net_before_vat, "vi")}</td>
                <td className="right">{formatNumber(it.line_vat, "vi")}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <tr key={`pad${i}`} className="pp-pad">
                <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="pp-totals">
          <tbody>
            <tr>
              <td className="pp-tot-label">{tCn("totalExclVat")}</td>
              <td className="pp-tot-val">{money(order.subtotal_ex_vat)}</td>
            </tr>
            <tr>
              <td className="pp-tot-label">{tCn("totalVat", { rate: vatRate })}</td>
              <td className="pp-tot-val">{money(order.vat_total)}</td>
            </tr>
            <tr>
              <td className="pp-tot-label bold">{tCn("totalInclVat")}</td>
              <td className="pp-tot-val bold">{money(order.grand_total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="pp-terms">
          <div className="pp-terms-title">{tVn("reg.title")} ({tCn("reg.title")})</div>
          <div className="pp-terms-list">
            <div className="pp-sec-head">{tVn("reg.s1Head")} {tCn("reg.s1Head")}</div>
            <div className="pp-bullet">{tVn("reg.s1B1")} {tCn("reg.s1B1")}</div>
            <div className="pp-bullet">{tVn("reg.s1B2")} {tCn("reg.s1B2")}</div>
            <div className="pp-sec-head">{tVn("reg.s2Head")} {tCn("reg.s2Head")}</div>
            <div className="pp-bullet">{tVn("reg.s2B1")} {tCn("reg.s2B1")}</div>
            <div className="pp-bullet">{tVn("reg.s2B2")} {tCn("reg.s2B2")}</div>
            <div className="pp-bullet">{tVn("reg.s2B3")} {tCn("reg.s2B3")}</div>
            <div className="pp-sec-head">{tVn("reg.s3Head")} {tCn("reg.s3Head")}</div>
            <div className="pp-bullet">{tVn("reg.s3Text")} {tCn("reg.s3Text")}</div>
          </div>
        </div>

        <div className="pp-sign">
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.manager")} {tVn("sig.manager")}</div>
            <div className="pp-sign-line" />
          </div>
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.buyer")} {tVn("sig.buyer")}</div>
            <div className="pp-sign-line">{order.buyer_name ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="pp-info2-field">
      <div className="lbl">{label}</div>
      <div className={multiline ? "val pre" : "val"}>{value || " "}</div>
    </div>
  );
}

function Inline({ label, value }: { label: string; value: string }) {
  return (
    <div className="pp-info2-inline">
      <span className="lbl">{label}: </span>
      <span className="val">{value || " "}</span>
    </div>
  );
}
