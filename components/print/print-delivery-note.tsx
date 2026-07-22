"use client";

import { useEffect } from "react";
import type { DeliveryNote, DeliveryItem } from "@/types/db";
import { formatNumber, formatFormDate } from "@/lib/number-format";
import type { Locale } from "@/i18n/request";

export function PrintDeliveryNote({
  note,
  items,
  orderCode,
  projectCode,
  poCode,
  tCn,
  tVn,
  locale,
}: {
  note: DeliveryNote;
  items: DeliveryItem[];
  orderCode?: string | null;
  projectCode?: string | null;
  poCode?: string | null;
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

  return (
    <div className="print-page">
      <div className="pp-inner pp-form pp-form2">
        <div className="pp-header">
          <img src="/forms/logo.png" alt={tCn("logoAlt")} className="pp-logo" />
          <div className="pp-company">
            <div className="pp-cn">{tCn("company")}</div>
            <div className="pp-company-vn">{tVn("company")}</div>
          </div>
        </div>

        <div className="pp-topbar">
          <span>{tCn("info.dnCode")}：{note.pgh_code || note.delivery_code}</span>
          <span>{tCn("info.deliveryDate")} {tVn("info.deliveryDate")}: {formatFormDate(note.delivery_date, locale)}</span>
        </div>

        <div className="pp-title-center">
          <div className="pp-title-cn">{tCn("dn.title")}</div>
          <div className="pp-title-vn">{tVn("dn.title")}</div>
        </div>

        <div className="pp-info2">
          <div className="pp-info2-left">
            <Field label={`${tCn("info.customerInfo")} ${tVn("info.customerInfo")}`} value={note.customer_info ?? ""} multiline />
            <Field label={`${tCn("info.owner")} ${tVn("info.owner")}`} value={note.responsible_person ?? ""} />
            <Field label={`${tCn("info.receiver")} ${tVn("info.receiver")}`} value={note.receiver_name ?? ""} />
          </div>
          <div className="pp-info2-right">
            <Inline label={`${tCn("info.orderCode")} ${tVn("info.orderCode")}`} value={orderCode ?? ""} />
            <Inline label={`${tCn("info.phone")} ${tVn("info.phone")}`} value={note.responsible_phone ?? ""} />
            <Inline label={`${tCn("info.phone")} ${tVn("info.phone")}`} value={note.receiver_phone ?? ""} />
          </div>
        </div>

        <table className="pp-items">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>{tCn("col.no")}{tVn("col.no")}</th>
              <th style={{ width: "54%" }}>{tCn("dn.colProduct")} {tVn("dn.colProduct")}</th>
              <th style={{ width: "15%" }}>{tCn("col.unit")} {tVn("col.unit")}</th>
              <th style={{ width: "23%" }}>{tCn("col.qty")} {tVn("col.qty")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="center">{it.seq}</td>
                <td>{it.product_name}</td>
                <td className="center">{it.unit ?? ""}</td>
                <td className="right">{formatNumber(it.delivered_qty, "vi")}</td>
              </tr>
            ))}
            {items.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`pad${i}`} className="pp-pad">
                  <td>&nbsp;</td><td></td><td></td><td></td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="pp-note-bar pp-note-stack">
          <span className="pp-note-text">{tCn("note3day")}</span>
          <span className="pp-note-text">{tVn("note3day")}</span>
        </div>

        <div className="pp-sign">
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.customer")} {tVn("sig.customer")}</div>
            <div className="pp-sign-line" />
          </div>
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.receiver")} {tVn("sig.receiver")}</div>
            <div className="pp-sign-line">{note.responsible_person ?? ""}</div>
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
