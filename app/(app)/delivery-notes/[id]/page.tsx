import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
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
import { ArrowLeft, Printer, Pencil } from "lucide-react";
import { DeleteDeliveryButton } from "@/components/delete-delivery-button";

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
      .select("*, purchase_orders(order_code, project_code, po_code, supplier_company)")
      .eq("id", id)
      .single(),
    supabase.from("delivery_items").select("*").eq("delivery_note_id", id).order("seq"),
  ]);
  if (!dnRes.data) notFound();
  const t = await getTranslations("delivery");
  const ts = await getTranslations("status.dn");
  const tc = await getTranslations("common");
  const to = await getTranslations("orders");
  const locale = await getLocale() as Locale;
  const note = dnRes.data as DeliveryNote & { purchase_orders: { order_code: string; project_code: string | null; po_code: string | null; supplier_company: string | null } };
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
              <h1 className="text-2xl font-semibold tracking-tight">{note.pgh_code || note.delivery_code}</h1>
              <Badge variant={note.status === "delivered" ? "default" : note.status === "cancelled" ? "destructive" : "secondary"}>
                {ts(note.status) ?? note.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("orderSummary", { orderCode: note.purchase_orders?.order_code ?? "—", supplier: note.purchase_orders?.supplier_company ?? "" })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/delivery-notes/${note.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> {tc("edit")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/print/dn/${note.id}`} target="_blank">
              <Printer className="mr-2 h-4 w-4" /> {tc("print")}
            </Link>
          </Button>
          <DeleteDeliveryButton id={note.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("deliveryInfoTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label={t("customer")} value={note.customer_info} />
            <Row label={to("projectCode")} value={note.purchase_orders?.project_code} />
            <Row label={to("orderCode")} value={note.purchase_orders?.po_code} />
            <Row label={t("responsible")} value={note.responsible_person} />
            <Row label={t("phone")} value={note.responsible_phone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("receiverTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label={t("receiver")} value={note.receiver_name} />
            <Row label={t("phone")} value={note.receiver_phone} />
            <Row label={t("date")} value={formatDate(note.delivery_date, locale)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("itemsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>{t("colProduct")}</TableHead>
                <TableHead className="w-16">{t("colUnit")}</TableHead>
                <TableHead className="w-24 text-right">{t("colQty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="text-muted-foreground">{it.seq}</TableCell>
                  <TableCell className="font-medium">{it.product_name}</TableCell>
                  <TableCell>{it.unit ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(it.delivered_qty, locale)}</TableCell>
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
