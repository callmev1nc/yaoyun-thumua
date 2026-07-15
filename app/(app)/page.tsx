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
import type { PurchaseOrder } from "@/types/db";

const ICONS = [ShoppingCart, Truck, TrendingUp, AlertCircle] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [orderCountRes, ledgerRes, dnRes, needPayRes, recentOrdersRes, paySummaryRes] = await Promise.all([
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
      .select("amount, order_id, purchase_orders!inner(status)")
      .eq("status", "unpaid")
      .not("planned_date", "is", null)
      .lte("planned_date", now.toISOString().slice(0, 10)),
    supabase
      .from("purchase_orders")
      .select("id, order_code, supplier_company, grand_total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payment_schedules")
      .select("amount, status")
      .eq("status", "paid"),
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

  const duePayments = (needPayRes.data ?? []).reduce(
    (s, r) => {
      const po = (r as unknown as { amount: number; purchase_orders: { status: string } }).purchase_orders;
      if (po?.status === "closed") return s;
      return s + Number((r as { amount: number }).amount);
    },
    0,
  );

  const recentOrders = (recentOrdersRes.data as PurchaseOrder[]) ?? [];

  const KPIS = [
    { label: "Đơn hàng trong tháng", value: formatNumber(monthOrders), href: "/purchase-orders", color: "from-primary/20 to-primary/5 text-primary" },
    { label: "Phiếu giao tháng này", value: formatNumber(monthDeliveries), href: "/delivery-notes", color: "from-blue-400/20 to-blue-400/5 text-blue-500" },
    { label: "Tổng cần chi", value: formatDong(totalNeedPay), href: "/ledger", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600" },
    { label: "Thanh toán đến hạn", value: formatDong(duePayments), href: "/purchase-orders", color: "from-amber-500/20 to-amber-500/5 text-amber-600" },
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
                        {o.supplier_company ?? "—"} · {formatDate(o.created_at)}
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
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Thanh toán đến hạn</span>
              </div>
              <span className="text-sm font-bold tabular-nums text-amber-700">{formatDong(duePayments)}</span>
            </div>
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
