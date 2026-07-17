import { createClient } from "@/lib/supabase/server";
import { CustomersManager } from "@/components/customers-manager";
import type { Customer } from "@/types/db";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, company_name, address, contact_name, phone, receiver_name, receiver_phone")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Khách hàng</h1>
        <p className="text-sm text-muted-foreground">
          Danh bạ khách hàng / nơi nhận hàng
        </p>
      </div>
      <CustomersManager customers={(data as Customer[]) ?? []} />
    </div>
  );
}
