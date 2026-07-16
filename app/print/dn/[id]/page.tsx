import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryNote, DeliveryItem } from "@/types/db";
import { PrintDeliveryNote } from "@/components/print/print-delivery-note";

export const dynamic = "force-dynamic";

export default async function PrintDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dn } = await supabase
    .from("delivery_notes")
    .select("*, purchase_orders(order_code, project_code, po_code)")
    .eq("id", id)
    .single();
  if (!dn) notFound();

  const { data: itemsData } = await supabase
    .from("delivery_items")
    .select("*")
    .eq("delivery_note_id", id)
    .order("seq");
  const items = (itemsData as DeliveryItem[]) ?? [];

  const po = (dn as unknown as { purchase_orders: { order_code: string; project_code: string | null; po_code: string | null } }).purchase_orders;

  return (
    <PrintDeliveryNote
      note={dn as DeliveryNote}
      items={items}
      orderCode={po?.order_code}
      projectCode={po?.project_code}
      poCode={po?.po_code}
    />
  );
}
