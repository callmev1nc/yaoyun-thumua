import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDong, formatNumber, formatDate } from "@/lib/number-format";
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
      .from("ledger")
      .select("net_before_vat"),
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
    (s, r) => s + Number((r as { net_before_vat: number }).net_before_vat),
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
    { label: "Đơn hàng trong tháng", value: formatNumber(monthOrders), href: "/purchase-orders", color: "from-primary/20 to-primary/5 text-primary" },
    { label: "Phiếu giao tháng này", value: formatNumber(monthDeliveries), href: "/delivery-notes", color: "from-blue-400/20 to-blue-400/5 text-blue-500" },
    { label: "Tổng cần chi", value: formatDong(totalNeedPay), href: "/ledger", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600" },
    { label: "Thanh toán đến hạn", value: formatDong(overduePayments + dueIn7), href: "/purchase-orders", color: "from-amber-500/20 to-amber-500/5 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
          <p className="text-sm text-muted-foreground">
            Hệ thống theo dõi thu mua Yaoyun
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/new">
            <Plus className="mr-2 h-4 w-4" /> Tạo đơn đặt hàng
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
                  <Link href={kpi.href}>Xem chi tiết →</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Chưa có đơn hàng nào.</p>
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
                        {o.supplier_company ?? "—"}{o.project_code ? ` · ${o.project_code}` : ""} · {formatDate(o.created_at)}
                      </p>
                    </div>
                    <span className="ml-4 text-sm font-semibold tabular-nums">{formatDong(o.grand_total)}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="border-t px-6 py-2">
              <Button asChild variant="link" className="h-auto p-0 text-xs">
                <Link href="/purchase-orders">
                  Xem tất cả đơn hàng <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tiến độ thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Đã chi / Tổng cần chi</span>
                <span className="font-medium tabular-nums">
                  {formatDong(totalPaid)} / {formatDong(totalNeedPay)}
                </span>
              </div>
              <Progress value={payRatio} className="h-2.5" />
              <p className="text-right text-xs text-muted-foreground">Đã thanh toán {payRatio}%</p>
            </div>
            {overduePayments > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive" className="text-[10px]">Quá hạn</Badge>
                </div>
                <span className="text-sm font-bold tabular-nums text-red-700">{formatDong(overduePayments)}</span>
              </div>
            )}
            {dueIn7 > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">Đến hạn 7 ngày</Badge>
                </div>
                <span className="text-sm font-bold tabular-nums text-amber-700">{formatDong(dueIn7)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spend by supplier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi tiêu theo NCC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spendBySupplier.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              spendBySupplier.map((s) => {
                const pct = maxSpend > 0 ? (Number(s.total_spend) / maxSpend) * 100 : 0;
                return (
                  <div key={s.supplier_company} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{s.supplier_company}</span>
                      <span className="tabular-nums text-muted-foreground">{formatDong(Number(s.total_spend))}</span>
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

      {/* Spend last 6 months + upcoming deliveries */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi tiêu 6 tháng</CardTitle>
          </CardHeader>
          <CardContent>
            {spend6moEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
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
                      <span className="w-28 text-right tabular-nums">{formatDong(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn sắp giao (7 ngày)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingDeliveries.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Không có đơn giao trong 7 ngày tới.</p>
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
                        {o.supplier_company ?? "—"}{o.project_code ? ` · ${o.project_code}` : ""} · Giao: {formatDate(o.delivery_date)}
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
          { icon: ClipboardList, label: "Đặt hàng", href: "/purchase-orders", desc: "Quản lý đơn hàng thu mua" },
          { icon: Truck, label: "Giao hàng", href: "/delivery-notes", desc: "Phiếu giao hàng (Form 2)" },
          { icon: Calculator, label: "Bảng tính tiền", href: "/ledger", desc: "Tổng hợp chi phí (Form 3)" },
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
