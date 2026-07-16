import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/number-format";
import type { LedgerRow } from "@/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await getCurrentUser();
  if (!ctx) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const companyFilter = searchParams.get("company")?.trim() ?? "";
  const orderFilter = searchParams.get("order")?.trim() ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("ledger")
    .select("*")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59");
  if (companyFilter) query = query.ilike("company", `%${companyFilter}%`);
  if (orderFilter) query = query.ilike("order_code", `%${orderFilter}%`);

  const { data } = await query;
  const rows = (data as LedgerRow[]) ?? [];

  const esc = (v: string | number | null | undefined) => {
    if (v == null) return "";
    // Collapse ALL record separators (CR/LF/CRLF) to a space first, so a cell
    // can never split a CSV row and a post-newline '=' payload can't run as a
    // formula (CSV/Formula Injection, CWE-1236).
    let s = String(v).replace(/\r\n|\r|\n/g, " ");
    // Prefix formula-triggering leading characters.
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (s.includes(",") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = "Ngày tạo,Ngày giao,Công ty,Đơn hàng,Mã dự án,Tên SP,DVT,SL,Đơn giá,Thành tiền,CK%,Tiền CK,Còn lại,Ghi chú";
  const csvLines = [header];

  for (const r of rows) {
    csvLines.push(
      [
        esc(formatDate(r.created_at)),
        esc(formatDate(r.delivery_date)),
        esc(r.company),
        esc(r.order_code),
        esc(r.project_code),
        esc(r.product_name),
        esc(r.unit),
        esc(r.quantity),
        esc(r.unit_price),
        esc(r.line_gross),
        esc(r.discount_percent),
        esc(r.discount_amount),
        esc(r.net_before_vat),
        esc(r.note),
      ].join(","),
    );
  }

  const csv = "\uFEFF" + csvLines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
