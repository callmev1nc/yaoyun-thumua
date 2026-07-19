import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { formatDong, formatNumber, formatDate } from "@/lib/number-format";
import type {
  PurchaseOrder,
  OrderItem,
  PaymentSchedule,
} from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Printer, Truck, Pencil, CheckCircle2, Clock } from "lucide-react";
import { POStatusBadge } from "@/components/po-status-badge";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { DuplicateOrderButton } from "@/components/duplicate-order-button";
import { Progress } from "@/components/ui/progress";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale() as Locale;
  const t = await getTranslations("orders");
  const tc = await getTranslations("common");
  const td = await getTranslations("delivery");
  const tsp = await getTranslations("suppliers");
  const tcu = await getTranslations("customers");
  const tpay = await getTranslations("status.payment");

  const [orderRes, itemsRes, payRes] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("order_items").select("*").eq("order_id", id).order("seq"),
    supabase
      .from("payment_schedules")
      .select("*")
      .eq("order_id", id)
      .order("installment_no"),
  ]);
  if (!orderRes.data) notFound();
  const po = orderRes.data as PurchaseOrder;
  const orderItems = (itemsRes.data as OrderItem[]) ?? [];
  const payRows = (payRes.data as PaymentSchedule[]) ?? [];

  const deliveredByItem = new Map<string, number>();
  const itemIds = orderItems.map((i) => i.id);
  if (itemIds.length) {
    const { data: ditems } = await supabase
      .from("delivery_items")
      .select("order_item_id, delivered_qty, delivery_notes!inner(status)")
      .in("order_item_id", itemIds);
    for (const d of (ditems as unknown as Array<{
      order_item_id: string;
      delivered_qty: number;
      delivery_notes: Array<{ status: string }>;
    }> | null) ?? []) {
      const dn = Array.isArray(d.delivery_notes) ? d.delivery_notes[0] : d.delivery_notes;
      if (dn?.status === "cancelled") continue;
      deliveredByItem.set(
        d.order_item_id,
        (deliveredByItem.get(d.order_item_id) ?? 0) + Number(d.delivered_qty),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{po.order_code}</h1>
              <POStatusBadge status={po.status} />
            </div>
            <p className="text-sm text-muted-foreground">{po.supplier_company ?? "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/purchase-orders/${po.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> {tc("edit")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/delivery-notes/new?orderId=${po.id}`}>
              <Truck className="mr-2 h-4 w-4" /> {td("create")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/print/po/${po.id}`} target="_blank">
              <Printer className="mr-2 h-4 w-4" /> {t("print")}
            </Link>
          </Button>
          <DuplicateOrderButton id={po.id} />
          <DeleteOrderButton id={po.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tsp("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label={t("company")} value={po.supplier_company} />
            <Row label={t("contact")} value={po.supplier_contact} />
            <Row label={t("supplierPhone")} value={po.supplier_phone} />
            <Row label={tcu("title")} value={po.customer_company} />
            <Row label={t("projectCode")} value={po.project_code} />
            <Row label={t("orderCode")} value={po.po_code} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("receiver")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label={t("receiver")} value={po.receiver_name} />
            <Row label={t("receiverPhone")} value={po.receiver_phone} />
            <Row label={t("deliveryAddress")} value={po.receiver_address} />
          </CardContent>
        </Card>
      </div>

      {/* Items with delivered/remaining (Mục 2 detail) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("itemsDetail")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead className="w-16">{t("unit")}</TableHead>
                  <TableHead className="text-right">{t("qtyOrdered")}</TableHead>
                  <TableHead className="text-right">{t("delivered")}</TableHead>
                  <TableHead className="text-right">{t("remaining")}</TableHead>
                  <TableHead className="text-right">{t("unitPrice")}</TableHead>
                  <TableHead className="text-right">{t("lineTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((it) => {
                  const delivered = deliveredByItem.get(it.id) ?? 0;
                  const remaining = Number(it.quantity) - delivered;
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="text-muted-foreground">{it.seq}</TableCell>
                      <TableCell className="font-medium">{it.product_name}</TableCell>
                      <TableCell>{it.unit ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(it.quantity, locale)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(delivered, locale)}
                        {delivered > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {remaining <= 0
                              ? t("fullyDelivered")
                              : t("remainingCount", { count: formatNumber(remaining, locale) })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {remaining < 0 ? (
                          <span className="text-destructive">{t("excess", { count: formatNumber(remaining, locale) })}</span>
                        ) : (
                          formatNumber(remaining, locale)
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(it.unit_price, locale)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDong(it.line_total, locale)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="ml-auto mt-4 w-full max-w-xs rounded-lg border border-primary/20 bg-primary/[0.03] p-3 text-sm">
            <Total label={t("totalExclVat")} value={formatDong(po.subtotal_ex_vat, locale)} />
            <Total label={t("vatTotal")} value={formatDong(po.vat_total, locale)} />
            <Separator className="my-1" />
            <Total label={t("totalInclVat")} value={formatDong(po.grand_total, locale)} strong />
          </div>
        </CardContent>
      </Card>

      {/* Payment schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("paymentSchedule", { count: payRows.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {payRows.length > 0 && (
            <div className="space-y-2">
              {(() => {
                const paidPct = payRows.reduce((s, p) => s + (p.status === "paid" ? p.percent : 0), 0);
                return (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("paidProgress")}</span>
                      <span className="font-medium tabular-nums">{formatNumber(paidPct, locale)}%</span>
                    </div>
                    <Progress value={paidPct} className="h-2.5" />
                  </>
                );
              })()}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("installment")}</TableHead>
                <TableHead className="text-right">{t("percent")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("plannedDate")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("paymentDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("paymentEmpty")}</TableCell>
                </TableRow>
              )}
              {payRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.installment_no}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(p.percent, locale)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDong(p.amount, locale)}</TableCell>
                  <TableCell>{formatDate(p.planned_date, locale)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "paid" ? "default" : "secondary"}
                      className={p.status === "paid" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}
                    >
                      {p.status === "paid" ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" /> {tpay("paid")}</>
                      ) : (
                        <><Clock className="mr-1 h-3 w-3" /> {tpay("unpaid")}</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(p.paid_date, locale)}</TableCell>
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
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
