"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { PurchaseOrder, OrderItem } from "@/types/db";
import {
  createDelivery,
  type DeliveryItemInput,
} from "@/lib/actions/delivery";
import { formatNumber, parseLooseNumber } from "@/lib/number-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ItemRow {
  order_item_id: string;
  product_name: string;
  unit: string | null;
  ordered_qty: number;
  already_delivered: number;
  remaining: number;
  delivered_qty: string;
}

export function DeliveryNoteForm({
  order,
  items,
  deliveredByItem,
  customerName,
}: {
  order: PurchaseOrder;
  items: OrderItem[];
  deliveredByItem: Map<string, number>;
  customerName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerInfo, setCustomerInfo] = useState(customerName ?? "");
  const [responsiblePerson, setResponsiblePerson] = useState(order.buyer_name ?? "");
  const [responsiblePhone, setResponsiblePhone] = useState(order.buyer_phone ?? "");
  const [receiverName, setReceiverName] = useState(order.receiver_name ?? "");
  const [receiverPhone, setReceiverPhone] = useState(order.receiver_phone ?? "");

  const [rows, setRows] = useState<ItemRow[]>(() =>
    items.map((it) => {
      const already = deliveredByItem.get(it.id) ?? 0;
      const remaining = Number(it.quantity) - already;
      return {
        order_item_id: it.id,
        product_name: it.product_name,
        unit: it.unit,
        ordered_qty: Number(it.quantity),
        already_delivered: already,
        remaining: Math.max(0, remaining),
        delivered_qty: String(Math.max(0, remaining)),
      };
    }),
  );

  const warningLines = useMemo(() => {
    const out: string[] = [];
    for (const r of rows) {
      const qty = parseLooseNumber(r.delivered_qty) || 0;
      if (qty > r.remaining) {
        out.push(`${r.product_name}: giao ${qty}, còn ${r.remaining}`);
      }
    }
    return out;
  }, [rows]);

  function updateRow(idx: number, delivered_qty: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, delivered_qty } : r)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const items: DeliveryItemInput[] = rows
      .map((r) => ({
        order_item_id: r.order_item_id,
        product_name: r.product_name,
        unit: r.unit,
        delivered_qty: parseLooseNumber(r.delivered_qty) || 0,
      }))
      .filter((it) => it.delivered_qty > 0);

    if (items.length === 0) {
      toast.error("Phải giao ít nhất 1 sản phẩm");
      return;
    }

    const over = rows.filter((r) => (parseLooseNumber(r.delivered_qty) || 0) > r.remaining);
    if (over.length > 0) {
      toast.error(
        `Giao vượt SL: ${over.map((r) => `${r.product_name} (SL: ${r.ordered_qty}, còn: ${r.remaining})`).join(", ")}`,
      );
      return;
    }

    startTransition(async () => {
      const res = await createDelivery({
        order_id: order.id,
        delivery_date: deliveryDate || null,
        customer_info: customerInfo,
        responsible_person: responsiblePerson,
        responsible_phone: responsiblePhone,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        items,
      });
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu giao hàng</h1>
          <p className="text-xs text-muted-foreground">
            Đơn hàng: {order.order_code} — {order.supplier_company ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu phiếu
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">THÔNG TIN GIAO HÀNG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Thông tin khách hàng" value={customerInfo} onChange={setCustomerInfo} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Người chịu trách nhiệm" value={responsiblePerson} onChange={setResponsiblePerson} />
              <Field label="SĐT" value={responsiblePhone} onChange={setResponsiblePhone} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">NGƯỜI NHẬN HÀNG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Người nhận" value={receiverName} onChange={setReceiverName} />
              <Field label="SĐT" value={receiverPhone} onChange={setReceiverPhone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ddate">Ngày giao hàng</Label>
              <Input id="ddate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh mục hàng giao</CardTitle>
        </CardHeader>
        <CardContent>
          {warningLines.length > 0 && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              Giao vượt số lượng còn lại: {warningLines.join("; ")}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="w-8 pb-2">TT</th>
                  <th className="pb-2 pr-2">交貨項目 / Tên hàng</th>
                  <th className="w-16 pb-2 pr-2">單位 DVT</th>
                  <th className="w-24 pb-2 pr-2 text-right">數量 SL đặt</th>
                  <th className="w-24 pb-2 pr-2 text-right">Đã giao</th>
                  <th className="w-24 pb-2 pr-2 text-right">Còn lại</th>
                  <th className="w-28 pb-2 text-right">Giao lần này</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const qty = parseLooseNumber(r.delivered_qty) || 0;
                  const over = qty > r.remaining;
                  const done = r.remaining <= 0;
                  return (
                    <tr key={r.order_item_id} className="align-top">
                      <td className="pb-2 pt-2 text-muted-foreground">{idx + 1}</td>
                      <td className="pb-2 pr-2 pt-2 font-medium">{r.product_name}</td>
                      <td className="pb-2 pr-2 pt-2">{r.unit ?? "—"}</td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums">{formatNumber(r.ordered_qty)}</td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums">{formatNumber(r.already_delivered)}</td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums">
                        {done ? (
                          <span className="text-muted-foreground">0</span>
                        ) : (
                          formatNumber(r.remaining)
                        )}
                      </td>
                      <td className="pb-2 pt-2">
                        <Input
                          inputMode="decimal"
                          className={`w-28 text-right ${over ? "border-destructive" : ""}`}
                          value={r.delivered_qty}
                          onChange={(e) => updateRow(idx, e.target.value)}
                          disabled={done}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
