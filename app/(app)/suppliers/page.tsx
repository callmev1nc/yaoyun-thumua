import { createClient } from "@/lib/supabase/server";
import { SuppliersManager } from "@/components/suppliers-manager";
import type { Supplier } from "@/types/db";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("id, company_name, contact_person, phone")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nhà cung cấp</h1>
        <p className="text-sm text-muted-foreground">
          Danh bạ NCC — dùng lại khi tạo đơn đặt hàng
        </p>
      </div>
      <SuppliersManager suppliers={(data as Supplier[]) ?? []} />
    </div>
  );
}
