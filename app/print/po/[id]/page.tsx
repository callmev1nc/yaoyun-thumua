import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { PrintPurchaseOrder } from "@/components/print/print-purchase-order";
import type { PurchaseOrder, OrderItem, PaymentSchedule } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function PrintPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale() as Locale;

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id).order("seq"),
    supabase
      .from("payment_schedules")
      .select("*")
      .eq("order_id", id)
      .order("installment_no"),
  ]);

  const tVn = await getTranslations({ locale: "vi", namespace: "print" });
  const cnVariant: Locale = locale === "zh-Hans" ? "zh-Hans" : "zh-Hant";
  const tCn = await getTranslations({ locale: cnVariant, namespace: "print" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translate = (t: any) => (key: string, values?: Record<string, any>) => t(key, values);

  return (
    <PrintPurchaseOrder
      order={order as PurchaseOrder}
      items={(items as OrderItem[]) ?? []}
      payments={(payments as PaymentSchedule[]) ?? []}
      tCn={translate(tCn)}
      tVn={translate(tVn)}
      locale={locale}
    />
  );
}
