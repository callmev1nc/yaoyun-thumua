"use client";

import { useEffect } from "react";
import type { DeliveryNote, DeliveryItem } from "@/types/db";
import { formatNumber, formatDate } from "@/lib/number-format";

export function PrintDeliveryNote({
  note,
  items,
  orderCode,
  projectCode,
  poCode,
}: {
  note: DeliveryNote;
  items: DeliveryItem[];
  orderCode?: string | null;
  projectCode?: string | null;
  poCode?: string | null;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="print-page">
      <div className="pp-inner">
        {/* Header */}
        <div className="pp-header">
          <img src="/forms/logo.png" alt="logo" className="pp-logo" />
          <div className="pp-company">
            <div className="pp-cn">曜雲科技有限公司</div>
            <div>CÔNG TY TNHH CÔNG NGHỆ YAOYUN</div>
          </div>
          <div className="pp-title">
            <div className="pp-title-cn">交貨單</div>
            <div className="pp-title-vn">PHIẾU GIAO HÀNG</div>
          </div>
        </div>

        {/* Info block */}
        <table className="pp-info">
          <tbody>
            <tr>
              <td className="pp-label">交貨資訊 / THÔNG TIN GIAO HÀNG</td>
              <td className="pp-val" colSpan={3}>
                {note.customer_info ?? ""}
              </td>
            </tr>
            <tr>
              <td className="pp-label">負責人 / NGƯỜI CHỊU TRÁCH NHIỆM</td>
              <td className="pp-val">{note.responsible_person ?? ""}</td>
              <td className="pp-label">電話 / SĐT</td>
              <td className="pp-val">{note.responsible_phone ?? ""}</td>
            </tr>
            <tr>
              <td className="pp-label">收貨人 / NGƯỜI NHẬN</td>
              <td className="pp-val">{note.receiver_name ?? ""}</td>
              <td className="pp-label">電話 / SĐT</td>
              <td className="pp-val">{note.receiver_phone ?? ""}</td>
            </tr>
            <tr>
              <td className="pp-label">訂單編號 / MÃ ĐƠN HÀNG</td>
              <td className="pp-val">{orderCode ?? ""}</td>
              <td className="pp-label">交貨日期 / NGÀY GIAO</td>
              <td className="pp-val">{formatDate(note.delivery_date)}</td>
            </tr>
            <tr>
              <td className="pp-label">專案代碼 / MÃ DỰ ÁN</td>
              <td className="pp-val">{projectCode ?? ""}</td>
              <td className="pp-label">訂單代碼 / MÃ ĐƠN ĐẶT</td>
              <td className="pp-val">{poCode ?? ""}</td>
            </tr>
            <tr>
              <td className="pp-label">交貨單號 / MÃ PHIẾU GIAO</td>
              <td className="pp-val" colSpan={3}>
                {note.delivery_code}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items - NO PRICE columns */}
        <table className="pp-items">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>序<br />TT</th>
              <th style={{ width: "52%" }}>交貨項目 / Tên hàng</th>
              <th style={{ width: "15%" }}>單位<br />DVT</th>
              <th style={{ width: "25%" }}>數量<br />SL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="center">{it.seq}</td>
                <td>{it.product_name}</td>
                <td className="center">{it.unit ?? ""}</td>
                <td className="right">{formatNumber(it.delivered_qty)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
              <tr key={`pad${i}`} className="pp-pad">
                <td>&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Note bar */}
        <div className="pp-note-bar">
          <span className="pp-note-label">備註 / GHI CHÚ</span>
          <span className="pp-note-text">
            Lỗi / khiếu nại phát sinh sau khi nhận: thông báo trong vòng 3 ngày kể từ ngày nhận hàng.
          </span>
        </div>

        {/* Signatures */}
        <div className="pp-sign">
          <div className="pp-sign-box">
            <div className="pp-sign-label">客戶簽名 / KHÁCH HÀNG</div>
            <div className="pp-sign-line" />
          </div>
          <div className="pp-sign-box">
            <div className="pp-sign-label">簽收 / KÝ GIAO HÀNG</div>
            <div className="pp-sign-line">{note.responsible_person ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
