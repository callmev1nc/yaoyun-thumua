import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDong, formatDate } from "@/lib/number-format";
import type { PurchaseOrder } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ClipboardList } from "lucide-react";
import { POStatusBadge } from "@/components/po-status-badge";
import { EmptyState } from "@/components/empty-state";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const supabase = await createClient();

  let query = supabase
    .from("purchase_orders")
    .select("id, order_code, customer_company, project_code, po_code, supplier_company, buyer_name, delivery_date, status, grand_total, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(
      `order_code.ilike.%${q}%,project_code.ilike.%${q}%,po_code.ilike.%${q}%,supplier_company.ilike.%${q}%,buyer_name.ilike.%${q}%`,
    );
  }
  const { data } = await query;
  const orders = (data as PurchaseOrder[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đơn đặt hàng</h1>
          <p className="text-sm text-muted-foreground">
            Thống kê & quản lý đơn đặt hàng thu mua (Form 1)
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/new">
            <Plus className="mr-2 h-4 w-4" /> Tạo đơn đặt hàng
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo mã, NCC, người mua…"
          className="pl-9"
        />
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Mã dự án</TableHead>
              <TableHead>Mã đơn đặt</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead>Người mua</TableHead>
              <TableHead>Ngày giao</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tổng gồm thuế</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <EmptyState
                icon={ClipboardList}
                title="Chưa có đơn đặt hàng nào"
                description="Tạo đơn đặt hàng đầu tiên để bắt đầu."
                colSpan={10}
                action={
                  <Button asChild size="sm">
                    <Link href="/purchase-orders/new">
                      <Plus className="mr-1 h-3 w-3" /> Tạo đơn đầu tiên
                    </Link>
                  </Button>
                }
              />
            )}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link
                    href={`/purchase-orders/${o.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {o.order_code}
                  </Link>
                </TableCell>
                <TableCell>{o.customer_company ?? "—"}</TableCell>
                <TableCell>{o.project_code ?? "—"}</TableCell>
                <TableCell>{o.po_code ?? "—"}</TableCell>
                <TableCell>{o.supplier_company ?? "—"}</TableCell>
                <TableCell>{o.buyer_name ?? "—"}</TableCell>
                <TableCell>{formatDate(o.delivery_date)}</TableCell>
                <TableCell>
                  <POStatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDong(o.grand_total)}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/purchase-orders/${o.id}`}>Xem</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
