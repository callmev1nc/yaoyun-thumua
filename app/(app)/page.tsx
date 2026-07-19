import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDong, formatNumber, formatDate } from "@/lib/number-format";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { ClipboardList, Truck, Calculator, Plus, ShoppingCart, TrendingUp, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { POStatusBadge } from "@/components/po-status-badge";
import type { PurchaseOrder, SpendBySupplierRow, OrderStatus } from "@/types/db";

const ICONS = [ShoppingCart, Truck, TrendingUp, AlertCircle] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const to = await getTranslations("orders");
  const locale = await getLocale() as Locale;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
  const sevenDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString().slice(0, 10);

  const [orderCountRes, ledgerRes, dnRes, needPayRes, recentOrdersRes, paySummaryRes, spendBySupplierRes, spend6moRes, upcomingDeliveriesRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("purchase_orders")
      .select("grand_total"),
    supabase
      .from("delivery_notes")
      .select("*", { count: "exact", head: true })
      .eq("status", "delivered")
      .gte("created_at", monthStart),
    supabase
      .from("payment_schedules")
      .select("amount, planned_date, order_id, purchase_orders!inner(status)")
      .eq("status", "unpaid")
      .not("planned_date", "is", null)
      .lte("planned_date", sevenDaysLater),
    supabase
      .from("purchase_orders")
      .select("id, order_code, project_code, po_code, supplier_company, grand_total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payment_schedules")
      .select("amount, status")
      .eq("status", "paid"),
    supabase
      .from("v_spend_by_supplier")
      .select("*")
      .order("total_spend", { ascending: false })
      .limit(5),
    supabase
      .from("purchase_orders")
      .select("grand_total, created_at")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("purchase_orders")
      .select("id, order_code, project_code, po_code, supplier_company, delivery_date, status")
      .eq("status", "confirmed")
      .gte("delivery_date", today)
      .lte("delivery_date", sevenDaysLater)
      .order("delivery_date"),
  ]);

  const monthOrders = orderCountRes.count ?? 0;
  const monthDeliveries = dnRes.count ?? 0;
  const totalNeedPay = (ledgerRes.data ?? []).reduce(
    (s, r) => s + Number((r as { grand_total: number }).grand_total),
    0,
  );
  const totalPaid = (paySummaryRes.data ?? []).reduce(
    (s, r) => s + Number((r as { amount: number }).amount),
    0,
  );
  const payRatio = totalNeedPay > 0 ? Math.round((totalPaid / totalNeedPay) * 100) : 0;

  const allDuePayments = (needPayRes.data ?? []) as unknown as Array<{ amount: number; planned_date: string; purchase_orders: { status: string }[] }>;
  let overduePayments = 0;
  let dueIn7 = 0;
  for (const r of allDuePayments) {
    const poArr = Array.isArray(r.purchase_orders) ? r.purchase_orders : [r.purchase_orders];
    if (poArr[0]?.status === "closed") continue;
    const amt = Number(r.amount);
    if (r.planned_date < today) {
      overduePayments += amt;
    } else {
      dueIn7 += amt;
    }
  }

  const recentOrders = (recentOrdersRes.data as PurchaseOrder[]) ?? [];

  const spendBySupplier = (spendBySupplierRes.data as SpendBySupplierRow[]) ?? [];
  const maxSpend = spendBySupplier.length > 0 ? Math.max(...spendBySupplier.map((s) => Number(s.total_spend))) : 0;

  const spend6moRaw = (spend6moRes.data ?? []) as Array<{ grand_total: number; created_at: string }>;
  const spendByMonth = new Map<string, number>();
  for (const r of spend6moRaw) {
    const ym = r.created_at.slice(0, 7);
    spendByMonth.set(ym, (spendByMonth.get(ym) ?? 0) + Number(r.grand_total));
  }
  const spend6moEntries = Array.from(spendByMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  const max6mo = spend6moEntries.length > 0 ? Math.max(...spend6moEntries.map(([, v]) => v)) : 0;

  const upcomingDeliveries = (upcomingDeliveriesRes.data ?? []) as Array<{ id: string; order_code: string; project_code: string | null; po_code: string | null; supplier_company: string | null; delivery_date: string; status: string }>;

  const KPIS = [
    { label: t("monthOrders"), value: formatNumber(monthOrders, locale), href: "/purchase-orders", color: "from-primary/20 to-primary/5 text-primary" },
    { label: t("monthDeliveries"), value: formatNumber(monthDeliveries, locale), href: "/delivery-notes", color: "from-blue-400/20 to-blue-400/5 text-blue-500" },
    { label: t("totalNeedPay"), value: formatDong(totalNeedPay - totalPaid, locale), href: "/ledger", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600" },
    { label: t("paymentDue"), value: formatDong(overduePayments + dueIn7, locale), href: "/purchase-orders", color: "from-amber-500/20 to-amber-500/5 text-amber-600" },
  ];

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
            <Plus className="mr-2 h-4 w-4" /> {to("create")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi, i) => {
          const Icon = ICONS[i];
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg bg-gradient-to-br p-2.5 ${kpi.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
                <Button asChild variant="link" className="mt-1 h-auto p-0 text-xs">
                  <Link href={kpi.href}>{t("viewDetails")}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{to("empty")}</p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/purchase-orders/${o.id}`}
                    className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{o.order_code}</span>
                        <POStatusBadge status={o.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {o.supplier_company ?? "—"}{o.project_code ? ` · ${o.project_code}` : ""} · {formatDate(o.created_at, locale)}
                      </p>
                    </div>
                    <span className="ml-4 text-sm font-semibold tabular-nums">{formatDong(o.grand_total, locale)}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="border-t px-6 py-2">
              <Button asChild variant="link" className="h-auto p-0 text-xs">
                <Link href="/purchase-orders">
                  {t("viewAllOrders")} <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("paymentProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("paidOverNeed")}</span>
                <span className="font-medium tabular-nums">
                  {formatDong(totalPaid, locale)} / {formatDong(totalNeedPay, locale)}
                </span>
              </div>
              <Progress value={payRatio} className="h-2.5" />
              <p className="text-right text-xs text-muted-foreground">{t("paidRatio", { ratio: payRatio })}</p>
            </div>
            {overduePayments > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive" className="text-[10px]">{t("overdue")}</Badge>
                </div>
                <span className="text-sm font-bold tabular-nums text-red-700">{formatDong(overduePayments, locale)}</span>
              </div>
            )}
            {dueIn7 > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">{t("dueIn7")}</Badge>
                </div>
                <span className="text-sm font-bold tabular-nums text-amber-700">{formatDong(dueIn7, locale)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("spendBySupplier")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spendBySupplier.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc("empty")}</p>
            ) : (
              spendBySupplier.map((s) => {
                const pct = maxSpend > 0 ? (Number(s.total_spend) / maxSpend) * 100 : 0;
                return (
                  <div key={s.supplier_company ?? "__unknown__"} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{s.supplier_company ?? t("unknownSupplier")}</span>
                      <span className="tabular-nums text-muted-foreground">{formatDong(Number(s.total_spend), locale)}</span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("spend6mo")}</CardTitle>
          </CardHeader>
          <CardContent>
            {spend6moEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc("empty")}</p>
            ) : (
              <div className="space-y-2">
                {spend6moEntries.map(([ym, total]) => {
                  const pct = max6mo > 0 ? (total / max6mo) * 100 : 0;
                  return (
                    <div key={ym} className="flex items-center gap-3 text-sm">
                      <span className="w-16 shrink-0 text-muted-foreground">{ym}</span>
                      <div className="flex-1">
                        <div className="h-3 rounded bg-primary/30" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-28 text-right tabular-nums">{formatDong(total, locale)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("upcomingDeliveries")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingDeliveries.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("noUpcomingDeliveries")}</p>
            ) : (
              <div className="divide-y">
                  {upcomingDeliveries.map((o) => (
                  <Link
                    key={o.id}
                    href={`/purchase-orders/${o.id}`}
                    className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{o.order_code}</span>
                        <POStatusBadge status={o.status as OrderStatus} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {o.supplier_company ?? "—"}{o.project_code ? ` · ${o.project_code}` : ""} · {t("deliveryShort")}: {formatDate(o.delivery_date, locale)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: ClipboardList, label: tn("orders"), href: "/purchase-orders", desc: t("manageOrders") },
          { icon: Truck, label: tn("delivery"), href: "/delivery-notes", desc: t("manageDelivery") },
          { icon: Calculator, label: tn("ledger"), href: "/ledger", desc: t("manageLedger") },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <q.icon className="h-5 w-5" />
            </div>
            <p className="font-semibold">{q.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
