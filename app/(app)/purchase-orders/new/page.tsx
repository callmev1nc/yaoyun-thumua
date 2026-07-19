import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import type { Supplier, Customer, Product, Buyer } from "@/types/db";

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();
  const ctx = await getCurrentUser();
  const [{ data: suppliers }, { data: customers }, { data: buyers }, { data: products }] = await Promise.all([
    supabase.from("suppliers").select("*").order("company_name"),
    supabase.from("customers").select("*").order("company_name"),
    supabase.from("buyers").select("*").order("name"),
    supabase.from("products").select("*").order("name"),
  ]);

  return (
    <PurchaseOrderForm
      suppliers={(suppliers as Supplier[]) ?? []}
      customers={(customers as Customer[]) ?? []}
      buyers={(buyers as Buyer[]) ?? []}
      products={(products as Product[]) ?? []}
      currentUserName={ctx?.profile?.full_name ?? ""}
      initialDefaults={ctx?.profile ?? undefined}
    />
  );
}
