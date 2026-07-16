import { createClient } from "@/lib/supabase/server";
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

  let query = supabase
    .from("ledger")
    .select("*")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59");
  if (companyFilter) query = query.ilike("company", `%${companyFilter}%`);
  if (orderFilter) query = query.ilike("order_code", `%${orderFilter}%`);

  const [dataRes, companiesRes] = await Promise.all([
    query,
    supabase
      .from("ledger")
      .select("company")
      .not("company", "is", null)
      .order("company"),
  ]);
  const rows = (dataRes.data as LedgerRow[]) ?? [];

  const sumGross = rows.reduce((s, r) => s + Number(r.line_gross), 0);
  const sumDiscount = rows.reduce((s, r) => s + Number(r.discount_amount), 0);
  const sumNet = rows.reduce((s, r) => s + Number(r.net_before_vat), 0);
  const totalItems = rows.length;

  const companies = Array.from(new Set((companiesRes.data ?? []).map((r: { company: string | null }) => r.company).filter(Boolean)));

  // CSV export URL — we use a plain link that triggers a download via API route.
  const csvParams = new URLSearchParams();
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);
  if (companyFilter) csvParams.set("company", companyFilter);
  if (orderFilter) csvParams.set("order", orderFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bảng tính tiền</h1>
          <p className="text-sm text-muted-foreground">
            Bảng tổng hợp các đơn hàng (Form 3)
          </p>
        </div>
        <Button asChild>
          <a href={`/api/ledger/csv?${csvParams}`}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>

      {/* Filters */}
      <form
        className="flex flex-wrap items-end gap-4 rounded-lg border p-4"
        method="GET"
      >
        <div className="space-y-1">
          <Label htmlFor="from">Từ ngày</Label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">Đến ngày</Label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="company">Công ty (NCC)</Label>
          <Input
            id="company"
            name="company"
            list="company-list"
            defaultValue={companyFilter}
            placeholder="Lọc theo NCC…"
            className="w-56"
          />
          <datalist id="company-list">
            {companies.map((c) => (
              <option key={c} value={c!} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="order">Đơn hàng</Label>
          <Input
            id="order"
            name="order"
            defaultValue={orderFilter}
            placeholder="Mã đơn…"
            className="w-40"
          />
        </div>
        <Button type="submit" variant="default">
          Lọc
        </Button>
      </form>

      {/* Totals cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số dòng</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatNumber(totalItems)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Σ Thành tiền</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatDong(sumGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Σ Tiền CK</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatDong(sumDiscount)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-primary">SỐ TIỀN CẦN CHI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-primary">{formatDong(sumNet)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
              <TableHead className="whitespace-nowrap">Ngày giao</TableHead>
              <TableHead className="whitespace-nowrap">Công ty</TableHead>
              <TableHead className="whitespace-nowrap">Đơn hàng</TableHead>
              <TableHead className="whitespace-nowrap">Mã dự án</TableHead>
              <TableHead className="whitespace-nowrap">Tên SP</TableHead>
              <TableHead className="w-14">DVT</TableHead>
              <TableHead className="text-right">SL</TableHead>
              <TableHead className="text-right">Đơn giá</TableHead>
              <TableHead className="text-right">Thành tiền</TableHead>
              <TableHead className="text-right">CK%</TableHead>
              <TableHead className="text-right">Tiền CK</TableHead>
              <TableHead className="text-right">Còn lại</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyState
                title="Không có dữ liệu"
                description="Thử thay đổi bộ lọc hoặc tạo đơn hàng mới."
                colSpan={14}
              />
            )}
            {rows.map((r, i) => (
              <TableRow key={`${r.order_id}-${r.product_name}-${i}`}>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.delivery_date)}</TableCell>
                <TableCell className="whitespace-nowrap">{r.company ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">{r.order_code}</TableCell>
                <TableCell className="whitespace-nowrap">{r.project_code ?? "—"}</TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.unit ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.quantity)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.unit_price)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDong(r.line_gross)}</TableCell>
                <TableCell className="text-right">{r.discount_percent ? `${formatNumber(r.discount_percent)}%` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDong(r.discount_amount)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatDong(r.net_before_vat)}</TableCell>
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
