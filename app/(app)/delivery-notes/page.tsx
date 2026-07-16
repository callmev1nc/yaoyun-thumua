import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/number-format";
import type { DeliveryNote } from "@/types/db";
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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Search, Truck } from "lucide-react";

const statusLabel: Record<string, string> = {
  draft: "Nháp",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

export default async function DeliveryNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const supabase = await createClient();

  let query = supabase
    .from("delivery_notes")
    .select("id, delivery_code, receiver_name, delivery_date, status, created_at, purchase_orders!inner(order_code, project_code, po_code, supplier_company)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(
      `delivery_code.ilike.%${q}%,receiver_name.ilike.%${q}%`,
    );
  }
  const { data } = await query;
  const notes = (data as unknown as Array<DeliveryNote & { purchase_orders: { order_code: string; project_code: string | null; po_code: string | null; supplier_company: string | null } }>) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Phiếu giao hàng</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách phiếu giao hàng (Form 2)
          </p>
        </div>
      </div>

      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo mã, người nhận…"
          className="pl-9"
        />
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Đơn hàng</TableHead>
              <TableHead>Mã dự án</TableHead>
              <TableHead>Mã đơn đặt</TableHead>
              <TableHead>NCC</TableHead>
              <TableHead>Người nhận</TableHead>
              <TableHead>Ngày giao</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.length === 0 && (
              <EmptyState
                icon={Truck}
                title="Chưa có phiếu giao hàng nào"
                description="Tạo phiếu giao hàng từ đơn đặt hàng."
                colSpan={9}
              />
            )}
            {notes.map((n) => (
              <TableRow key={n.id}>
                <TableCell>
                  <Link
                    href={`/delivery-notes/${n.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {n.delivery_code}
                  </Link>
                </TableCell>
                <TableCell>{n.purchase_orders?.order_code ?? "—"}</TableCell>
                <TableCell>{n.purchase_orders?.project_code ?? "—"}</TableCell>
                <TableCell>{n.purchase_orders?.po_code ?? "—"}</TableCell>
                <TableCell>{n.purchase_orders?.supplier_company ?? "—"}</TableCell>
                <TableCell>{n.receiver_name ?? "—"}</TableCell>
                <TableCell>{formatDate(n.delivery_date)}</TableCell>
                <TableCell>
                  <Badge variant={n.status === "delivered" ? "default" : n.status === "cancelled" ? "destructive" : "secondary"}>
                    {statusLabel[n.status] ?? n.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/delivery-notes/${n.id}`}>Xem</Link>
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
