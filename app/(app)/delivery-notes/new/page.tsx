import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeliveryNoteForm } from "@/components/forms/delivery-note-form";
import type { PurchaseOrder, OrderItem, Customer } from "@/types/db";

export default async function NewDeliveryNotePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order) notFound();
  const po = order as PurchaseOrder;

  // Resolve customer name from customer_id for delivery note default
  let customerName = "";
  if (po.customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("company_name")
      .eq("id", po.customer_id)
      .single();
    customerName = (cust as Pick<Customer, "company_name"> | null)?.company_name ?? "";
  }

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("seq");
  const items = (itemsData as OrderItem[]) ?? [];

  const deliveredByItem = new Map<string, number>();
  const itemIds = items.map((i) => i.id);
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
      const dn = Array.isArray(d.delivery_notes) ? d.delivery_notes[0] : d.delivery_notes;
      if (dn?.status === "cancelled") continue;
      deliveredByItem.set(
        d.order_item_id,
        (deliveredByItem.get(d.order_item_id) ?? 0) + Number(d.delivered_qty),
      );
    }
  }

  return (
    <DeliveryNoteForm
      order={po}
      items={items}
      deliveredByItem={deliveredByItem}
      customerName={customerName}
    />
  );
}
