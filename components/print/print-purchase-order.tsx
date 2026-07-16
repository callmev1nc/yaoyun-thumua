"use client";

import { useEffect } from "react";
import type { PurchaseOrder, OrderItem, PaymentSchedule } from "@/types/db";
import { formatNumber, formatDong, formatDate } from "@/lib/number-format";

export function PrintPurchaseOrder({
  order,
  items,
  payments,
}: {
  order: PurchaseOrder;
  items: OrderItem[];
  payments: PaymentSchedule[];
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
              `Đợt ${i + 1}: ${formatNumber(p.percent)}%${p.planned_date ? ` (${formatDate(p.planned_date)})` : ""}${p.status === "paid" ? " ✓" : ""}`,
          )
          .join(" · ")
      : "—";

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
            <div className="pp-title-cn">採購單</div>
            <div className="pp-title-vn">PHIẾU ĐẶT HÀNG</div>
          </div>
        </div>

        {/* Info block */}
        <table className="pp-info">
          <tbody>
            <InfoRow
              l1="THÔNG TIN NCC"
              v1={order.supplier_company ?? ""}
              l2="Mã đơn"
              v2={order.order_code}
            />
            <InfoRow
              l1="MÃ DỰ ÁN"
              v1={order.project_code ?? ""}
              l2="MÃ ĐƠN ĐẶT"
              v2={order.po_code ?? ""}
            />
            <InfoRow
              l1="NGƯỜI PHỤ TRÁCH NCC"
              v1={order.supplier_contact ?? ""}
              l2="SDT NCC"
              v2={order.supplier_phone ?? ""}
            />
            <InfoRow
              l1="NGƯỜI MUA HÀNG"
              v1={order.buyer_name ?? ""}
              l2="SDT"
              v2={order.buyer_phone ?? ""}
            />
            <InfoRow
              l1="NGƯỜI NHẬN HÀNG"
              v1={order.receiver_name ?? ""}
              l2="SDT"
              v2={order.receiver_phone ?? ""}
            />
            <tr>
              <td className="pp-label">ĐỊA CHỈ NHẬN HÀNG</td>
              <td className="pp-val" colSpan={3}>
                {order.receiver_address ?? ""}
              </td>
            </tr>
            <tr>
              <td className="pp-label">HÌNH THỨC THANH TOÁN</td>
              <td className="pp-val" colSpan={3}>
                {payText}
              </td>
            </tr>
            <tr>
              <td className="pp-label">THỜI GIAN GIAO HÀNG</td>
              <td className="pp-val" colSpan={3}>
                {formatDate(order.delivery_date)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items */}
        <table className="pp-items">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>序<br />TT</th>
              <th style={{ width: "30%" }}>採購項目 / Tên sản phẩm</th>
              <th style={{ width: "8%" }}>單位<br />DVT</th>
              <th style={{ width: "10%" }}>數量<br />SL</th>
              <th style={{ width: "14%" }}>單價<br />D.GIÁ</th>
              <th style={{ width: "18%" }}>小計<br />T.TIỀN CHƯA VAT</th>
              <th style={{ width: "15%" }}>稅額<br />VAT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="center">{it.seq}</td>
                <td>{it.product_name}</td>
                <td className="center">{it.unit ?? ""}</td>
                <td className="right">{formatNumber(it.quantity)}</td>
                <td className="right">{formatNumber(it.unit_price)}</td>
                <td className="right">{formatNumber(it.net_before_vat)}</td>
                <td className="right">{formatNumber(it.line_vat)}</td>
              </tr>
            ))}
            {/* pad to fill */}
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

        {/* Totals */}
        <table className="pp-totals">
          <tbody>
            <tr>
              <td className="pp-tot-label">總價 (未稅) 為 / Tổng tiền chưa thuế</td>
              <td className="pp-tot-val">{formatDong(order.subtotal_ex_vat)}</td>
            </tr>
            <tr>
              <td className="pp-tot-label">{vatLabel} 為 / Tiền thuế</td>
              <td className="pp-tot-val">{formatDong(order.vat_total)}</td>
            </tr>
            <tr>
              <td className="pp-tot-label bold">總價 (已含稅) 為 / Tổng tiền gồm thuế</td>
              <td className="pp-tot-val bold">{formatDong(order.grand_total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Terms box */}
        <div className="pp-terms">
          <div className="pp-terms-title">QUY ĐỊNH HÀNG HÓA (貨物規定)</div>
          <div className="pp-terms-grid">
            <div>
              <b>Chất lượng &amp; Quy cách (質量與規格)</b>
              <p>Hàng hóa phải đúng quy cách, chất lượng như thỏa thuận trong đơn đặt hàng.</p>
            </div>
            <div>
              <b>Từ chối nhận hàng (拒收規定)</b>
              <p>Được quyền từ chối nhận hàng sai quy cách, thiếu số lượng hoặc hư hỏng.</p>
            </div>
            <div>
              <b>Lỗi phát sinh sau nhập kho (入庫後發現缺陷)</b>
              <p>Thông báo trong vòng 3 ngày kể từ ngày nhận hàng để được xử lý.</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="pp-sign">
          <div className="pp-sign-box">
            <div className="pp-sign-label">主管簽名 · CHỦ KÝ CHỦ QUẢN</div>
            <div className="pp-sign-line" />
          </div>
          <div className="pp-sign-box">
            <div className="pp-sign-label">採購簽名 · CHỦ KÝ THU MUA</div>
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
