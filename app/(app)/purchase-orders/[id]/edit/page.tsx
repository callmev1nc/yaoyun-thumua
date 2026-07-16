import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import type { Supplier, Customer, Product, Buyer, PurchaseOrder, OrderItem, PaymentSchedule } from "@/types/db";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getCurrentUser();

  const [orderRes, itemsRes, payRes, { data: suppliers }, { data: customers }, { data: buyers }, { data: products }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("order_items").select("*").eq("order_id", id).order("seq"),
    supabase.from("payment_schedules").select("*").eq("order_id", id).order("installment_no"),
    supabase.from("suppliers").select("*").order("company_name"),
    supabase.from("customers").select("*").order("company_name"),
    supabase.from("buyers").select("*").order("name"),
    supabase.from("products").select("*").order("name"),
  ]);
  if (!orderRes.data) notFound();

  return (
    <PurchaseOrderForm
      suppliers={(suppliers as Supplier[]) ?? []}
      customers={(customers as Customer[]) ?? []}
      buyers={(buyers as Buyer[]) ?? []}
      products={(products as Product[]) ?? []}
      currentUserName={ctx?.profile?.full_name ?? ""}
      mode="edit"
      initialOrder={orderRes.data as PurchaseOrder}
      initialItems={(itemsRes.data as OrderItem[]) ?? []}
      initialPayments={(payRes.data as PaymentSchedule[]) ?? []}
    />
  );
}
