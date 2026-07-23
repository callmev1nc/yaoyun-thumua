import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeliveryNoteForm } from "@/components/forms/delivery-note-form";
import type { PurchaseOrder, OrderItem, DeliveryNote, DeliveryItem, Customer } from "@/types/db";

export default async function EditDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [dnRes, itemsRes] = await Promise.all([
    supabase
      .from("delivery_notes")
      .select("*, purchase_orders(*)")
      .eq("id", id)
      .single(),
    supabase.from("delivery_items").select("*").eq("delivery_note_id", id).order("seq"),
  ]);
  if (!dnRes.data) notFound();

  const dn = dnRes.data as DeliveryNote & { purchase_orders: PurchaseOrder };
  const po = dn.purchase_orders;
  const items = (itemsRes.data as DeliveryItem[]) ?? [];

  // Resolve customer name
  let customerName = po.customer_company ?? "";
  if (po.customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("company_name")
      .eq("id", po.customer_id)
      .single();
    customerName = (cust as Pick<Customer, "company_name"> | null)?.company_name ?? customerName;
  }

  // Build deliveredByItem map (excludes cancelled DN rows)
  const deliveredByItem = new Map<string, number>();

  // Get all order items for this order
  const { data: orderItemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", po.id)
    .order("seq");
  const orderItems = (orderItemsData as OrderItem[]) ?? [];
  const itemIds = orderItems.map((i) => i.id);

  if (itemIds.length) {
    const { data: ditems } = await supabase
      .from("delivery_items")
      .select("order_item_id, delivered_qty, delivery_notes!inner(status)")
      .in("order_item_id", itemIds);
    for (const d of (ditems as unknown as Array<{
      order_item_id: string;
      delivered_qty: number;
      delivery_notes: Array<{ status: string }>;
    }> | null) ?? []) {
      const ddn = Array.isArray(d.delivery_notes) ? d.delivery_notes[0] : d.delivery_notes;
      if (ddn?.status === "cancelled") continue;
      deliveredByItem.set(
        d.order_item_id,
        (deliveredByItem.get(d.order_item_id) ?? 0) + Number(d.delivered_qty),
      );
    }
  }

  return (
    <DeliveryNoteForm
      order={po}
      items={orderItems}
      deliveredByItem={Object.fromEntries(deliveredByItem)}
      customerName={customerName}
      mode="edit"
      initialNote={dn}
      initialItems={items}
    />
  );
}
