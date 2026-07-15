import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatDate } from "@/lib/number-format";
import type { DeliveryNote, DeliveryItem } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";
import { DeleteDeliveryButton } from "@/components/delete-delivery-button";

const statusLabel: Record<string, string> = {
  draft: "Nháp",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

export default async function DeliveryNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [dnRes, itemsRes] = await Promise.all([
    supabase
      .from("delivery_notes")
      .select("*, purchase_orders(order_code, supplier_company)")
      .eq("id", id)
      .single(),
    supabase.from("delivery_items").select("*").eq("delivery_note_id", id).order("seq"),
  ]);
  if (!dnRes.data) notFound();
  const note = dnRes.data as DeliveryNote & { purchase_orders: { order_code: string; supplier_company: string | null } };
  const items = (itemsRes.data as DeliveryItem[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/delivery-notes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{note.delivery_code}</h1>
              <Badge variant={note.status === "delivered" ? "default" : note.status === "cancelled" ? "destructive" : "secondary"}>
                {statusLabel[note.status] ?? note.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Đơn hàng: {note.purchase_orders?.order_code ?? "—"} · {note.purchase_orders?.supplier_company ?? ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/print/dn/${note.id}`} target="_blank">
              <Printer className="mr-2 h-4 w-4" /> In phiếu
            </Link>
          </Button>
          <DeleteDeliveryButton id={note.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">THÔNG TIN GIAO HÀNG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Khách hàng" value={note.customer_info} />
            <Row label="Người chịu trách nhiệm" value={note.responsible_person} />
            <Row label="SĐT" value={note.responsible_phone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">NGƯỜI NHẬN HÀNG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Người nhận" value={note.receiver_name} />
            <Row label="SĐT" value={note.receiver_phone} />
            <Row label="Ngày giao" value={formatDate(note.delivery_date)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh mục hàng giao</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>交貨項目 / Tên hàng</TableHead>
                <TableHead className="w-16">單位 DVT</TableHead>
                <TableHead className="w-24 text-right">數量 SL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="text-muted-foreground">{it.seq}</TableCell>
                  <TableCell className="font-medium">{it.product_name}</TableCell>
                  <TableCell>{it.unit ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(it.delivered_qty)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}
