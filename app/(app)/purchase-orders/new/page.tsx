import { createClient } from "@/lib/supabase/server";
import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import type { Supplier, Customer } from "@/types/db";

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();
  const [{ data: suppliers }, { data: customers }] = await Promise.all([
    supabase.from("suppliers").select("*").order("company_name"),
    supabase.from("customers").select("*").order("company_name"),
  ]);

  return (
    <PurchaseOrderForm
      suppliers={(suppliers as Supplier[]) ?? []}
      customers={(customers as Customer[]) ?? []}
    />
  );
}
