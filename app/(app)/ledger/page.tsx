import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { formatNumber, formatDong, formatDate } from "@/lib/number-format";
import type { LedgerRow } from "@/types/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    company?: string;
    order?: string;
  }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const companyFilter = sp.company?.trim() ?? "";
  const orderFilter = sp.order?.trim() ?? "";

  const supabase = await createClient();
  const t = await getTranslations("ledger");
  const tc = await getTranslations("common");
  const locale = await getLocale() as Locale;

  let query = supabase
    .from("ledger")
    .select("*")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59");
  if (companyFilter) query = query.ilike("company", `%${companyFilter}%`);
  if (orderFilter) query = query.or(`order_code.ilike.%${orderFilter}%,po_code.ilike.%${orderFilter}%`);

  const [dataRes, companiesRes] = await Promise.all([
    query,
    supabase
      .from("ledger")
      .select("company")
      .not("company", "is", null)
      .order("company"),
  ]);
  const rows = (dataRes.data as LedgerRow[]) ?? [];

  const sumTotal = rows.reduce((s, r) => s + Number(r.line_total), 0);
  const remainingByOrder = new Map<string, number>();
  for (const r of rows) remainingByOrder.set(r.order_id, Number(r.order_remaining));
  const sumNeedPay = Array.from(remainingByOrder.values()).reduce((s, v) => s + v, 0);
  const totalItems = rows.length;

  const companies = Array.from(new Set((companiesRes.data ?? []).map((r: { company: string | null }) => r.company).filter(Boolean)));

  const csvParams = new URLSearchParams();
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);
  if (companyFilter) csvParams.set("company", companyFilter);
  if (orderFilter) csvParams.set("order", orderFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild>
          <a href={`/api/ledger/csv?${csvParams}`}>
            <Download className="mr-2 h-4 w-4" /> {tc("exportCsv")}
          </a>
        </Button>
      </div>

      <form
        className="flex flex-wrap items-end gap-4 rounded-lg border p-4"
        method="GET"
      >
        <div className="space-y-1">
          <Label htmlFor="from">{t("fromDate")}</Label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">{t("toDate")}</Label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="company">{t("company")}</Label>
          <Input
            id="company"
            name="company"
            list="company-list"
            defaultValue={companyFilter}
            placeholder={t("filterSupplier")}
            className="w-56"
          />
          <datalist id="company-list">
            {companies.map((c) => (
              <option key={c} value={c!} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="order">{t("col.order")}</Label>
          <Input
            id="order"
            name="order"
            defaultValue={orderFilter}
            placeholder={t("filterCode")}
            className="w-40"
          />
        </div>
        <Button type="submit" variant="default">
          {tc("filter")}
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalRows")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatNumber(totalItems, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("sumAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatDong(sumTotal, locale)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-primary">{t("amountToPay")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-primary">{formatDong(sumNeedPay, locale)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{t("col.createdAt")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("col.deliveredAt")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("col.company")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("col.order")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("col.projectCode")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("col.product")}</TableHead>
              <TableHead className="w-14">{t("col.unit")}</TableHead>
              <TableHead className="text-right">{t("col.qty")}</TableHead>
              <TableHead className="text-right">{t("col.unitPrice")}</TableHead>
              <TableHead className="text-right">{t("col.amount")}</TableHead>
              <TableHead className="text-right">{t("col.remaining")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("col.paymentDue")}</TableHead>
              <TableHead>{t("col.note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyState
                title={tc("empty")}
                description={t("emptyHint")}
                colSpan={13}
              />
            )}
            {rows.map((r, i) => (
              <TableRow key={`${r.order_id}-${r.product_name}-${i}`}>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.created_at, locale)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.delivery_date, locale)}</TableCell>
                <TableCell className="whitespace-nowrap">{r.company ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">{r.po_code ?? r.order_code}</TableCell>
                <TableCell className="whitespace-nowrap">{r.project_code ?? "—"}</TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.unit ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.quantity, locale)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.unit_price, locale)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDong(r.line_total, locale)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatDong(r.order_remaining, locale)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.payment_due_date, locale)}</TableCell>
                <TableCell className="max-w-40 truncate text-xs text-muted-foreground" title={r.note ?? ""}>
                  {r.note ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
