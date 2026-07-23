import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
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
import { Plus, Search } from "lucide-react";
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
  const t = await getTranslations("orders");
  const tc = await getTranslations("common");
  const locale = await getLocale() as Locale;

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
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/new">
            <Plus className="mr-2 h-4 w-4" /> {t("create")}
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("customer")}</TableHead>
              <TableHead>{t("projectCode")}</TableHead>
              <TableHead>{t("orderCode")}</TableHead>
              <TableHead>{t("supplierCompany")}</TableHead>
              <TableHead>{t("buyer")}</TableHead>
              <TableHead>{t("deliveryDate")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("totalInclVat")}</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <EmptyState
                title={t("empty")}
                description={t("emptyHint")}
                colSpan={10}
                action={
                  <Button asChild size="sm">
                    <Link href="/purchase-orders/new">
                      <Plus className="mr-1 h-3 w-3" /> {t("create")}
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
                <TableCell>{formatDate(o.delivery_date, locale)}</TableCell>
                <TableCell>
                  <POStatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDong(o.grand_total, locale)}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/purchase-orders/${o.id}`}>{tc("view")}</Link>
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
