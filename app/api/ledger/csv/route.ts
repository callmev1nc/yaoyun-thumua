import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getTranslations, getLocale } from "next-intl/server";
import { formatDate } from "@/lib/number-format";
import type { Locale } from "@/i18n/request";
import type { LedgerRow } from "@/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await getCurrentUser();
  if (!ctx) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const locale = await getLocale() as Locale;
  const t = await getTranslations("ledger");

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
  if (orderFilter) query = query.or(`order_code.ilike.%${orderFilter}%,po_code.ilike.%${orderFilter}%`);

  const { data } = await query;
  const rows = (data as LedgerRow[]) ?? [];

  const esc = (v: string | number | null | undefined) => {
    if (v == null) return "";
    let s = String(v).replace(/\r\n|\r|\n/g, " ");
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (s.includes(",") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = [
    t("col.createdAt"), t("col.deliveredAt"), t("col.company"), t("col.order"),
    t("col.projectCode"), t("col.product"), t("col.unit"), t("col.qty"),
    t("col.unitPrice"), t("col.amount"), t("col.remaining"), t("col.paymentDue"), t("col.note"),
  ].join(",");

  const csvLines = [header];

  for (const r of rows) {
    csvLines.push(
      [
        esc(formatDate(r.created_at, locale)),
        esc(formatDate(r.delivery_date, locale)),
        esc(r.company),
        esc(r.po_code ?? r.order_code),
        esc(r.project_code),
        esc(r.product_name),
        esc(r.unit),
        esc(r.quantity),
        esc(r.unit_price),
        esc(r.line_total),
        esc(r.order_remaining),
        esc(formatDate(r.payment_due_date, locale)),
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
