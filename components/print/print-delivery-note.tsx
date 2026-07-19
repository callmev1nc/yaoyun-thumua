"use client";

import { useEffect } from "react";
import type { DeliveryNote, DeliveryItem } from "@/types/db";
import { formatNumber, formatDate } from "@/lib/number-format";
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
      <div className="pp-inner">
        <div className="pp-header">
          <img src="/forms/logo.png" alt={tCn("logoAlt")} className="pp-logo" />
          <div className="pp-company">
            <div className="pp-cn">{tCn("company")}</div>
            <div>{tVn("company")}</div>
          </div>
          <div className="pp-title">
            <div className="pp-title-cn">{tCn("dn.title")}</div>
            <div className="pp-title-vn">{tVn("dn.title")}</div>
          </div>
        </div>

        <table className="pp-info">
          <tbody>
            <tr>
              <td className="pp-label">{tCn("info.delivery")} / {tVn("info.delivery")}</td>
              <td className="pp-val" colSpan={3}>
                {note.customer_info ?? ""}
              </td>
            </tr>
            <tr>
              <td className="pp-label">{tCn("info.owner")} / {tVn("info.owner")}</td>
              <td className="pp-val">{note.responsible_person ?? ""}</td>
              <td className="pp-label">{tCn("info.phone")} / {tVn("info.phone")}</td>
              <td className="pp-val">{note.responsible_phone ?? ""}</td>
            </tr>
            <tr>
              <td className="pp-label">{tCn("info.receiver")} / {tVn("info.receiver")}</td>
              <td className="pp-val">{note.receiver_name ?? ""}</td>
              <td className="pp-label">{tCn("info.phone")} / {tVn("info.phone")}</td>
              <td className="pp-val">{note.receiver_phone ?? ""}</td>
            </tr>
            <tr>
              <td className="pp-label">{tCn("info.dnCode")} / {tVn("info.dnCode")}</td>
              <td className="pp-val">{note.pgh_code || note.delivery_code}</td>
              <td className="pp-label">{tCn("info.deliveryDate")} / {tVn("info.deliveryDate")}</td>
              <td className="pp-val">{formatDate(note.delivery_date, locale)}</td>
            </tr>
            <tr>
              <td className="pp-label">{tCn("info.projectCode")} / {tVn("info.projectCode")}</td>
              <td className="pp-val">{projectCode ?? ""}</td>
              <td className="pp-label">{tCn("info.orderCode")} / {tVn("info.orderCode")}</td>
              <td className="pp-val">{poCode ?? ""}</td>
            </tr>
          </tbody>
        </table>

        <table className="pp-items">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>{tCn("col.no")}<br />{tVn("col.no")}</th>
              <th style={{ width: "52%" }}>{tCn("col.product")} / {tVn("col.product")}</th>
              <th style={{ width: "15%" }}>{tCn("col.unit")}<br />{tVn("col.unit")}</th>
              <th style={{ width: "25%" }}>{tCn("col.qty")}<br />{tVn("col.qty")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="center">{it.seq}</td>
                <td>{it.product_name}</td>
                <td className="center">{it.unit ?? ""}</td>
                <td className="right">{formatNumber(it.delivered_qty, locale)}</td>
              </tr>
            ))}
            {items.length === 0 && Array.from({ length: 8 }).map((_, i) => (
              <tr key={`pad${i}`} className="pp-pad">
                <td>&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pp-note-bar">
          <span className="pp-note-label">{tCn("info.note")} / {tVn("info.note")}</span>
          <span className="pp-note-text">
            {tVn("note3day")}
          </span>
        </div>

        <div className="pp-sign">
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.customer")} / {tVn("sig.customer")}</div>
            <div className="pp-sign-line" />
          </div>
          <div className="pp-sign-box">
            <div className="pp-sign-label">{tCn("sig.receiver")} / {tVn("sig.receiver")}</div>
            <div className="pp-sign-line">{note.responsible_person ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
