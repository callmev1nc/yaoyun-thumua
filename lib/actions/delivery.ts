"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { DeliveryStatus } from "@/types/db";
import { updateDeliverySchema } from "@/lib/validation";

export interface DeliveryItemInput {
  order_item_id: string;
  product_name: string;
  unit: string | null;
  delivered_qty: number;
}

export interface CreateDeliveryInput {
  order_id: string;
  delivery_date: string | null;
  customer_info: string;
  responsible_person: string;
  responsible_phone: string;
  receiver_name: string;
  receiver_phone: string;
  pgh_code?: string;
  customer_id?: string | null;
  items: DeliveryItemInput[];
}

async function nextDeliveryCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
): Promise<string> {
  const prefix = `GH${year}`;
  const { data } = await supabase
    .from("delivery_notes")
    .select("delivery_code")
    .like("delivery_code", `${prefix}%`);

  let max = 0;
  for (const r of data ?? []) {
    const seq = parseInt((r.delivery_code ?? "").slice(prefix.length), 10);
    if (!Number.isNaN(seq)) max = Math.max(max, seq);
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

export async function createDelivery(input: CreateDeliveryInput) {
  const ctx = await getCurrentUser();
  const t = await getTranslations("errors");
  if (!ctx) return { error: t("notLoggedIn") };
  if (!input.items.length) return { error: t("needOneItem") };

  const supabase = await createClient();
  const year = new Date().getFullYear();

  // Validate items belong to this order and check remaining quantities
  const { data: orderItems, error: oiErr } = await supabase
    .from("order_items")
    .select("id, quantity, product_name")
    .eq("order_id", input.order_id);
  if (oiErr) return { error: oiErr.message };
  if (!orderItems?.length) return { error: t("orderNoItems") };

  const itemMap = new Map(orderItems.map((i) => [i.id, i]));

  // Get already-delivered quantities (skip cancelled DNs)
  const { data: deliveredData } = await supabase
    .from("delivery_items")
    .select("order_item_id, delivered_qty, delivery_notes!inner(status)")
    .in("order_item_id", orderItems.map((i) => i.id));

  const deliveredMap = new Map<string, number>();
  for (const d of (deliveredData as unknown as Array<{
    order_item_id: string;
    delivered_qty: number;
    delivery_notes: Array<{ status: string }>;
  }> | null) ?? []) {
    const dn = Array.isArray(d.delivery_notes) ? d.delivery_notes[0] : d.delivery_notes;
    if (dn?.status === "cancelled") continue;
    deliveredMap.set(d.order_item_id, (deliveredMap.get(d.order_item_id) ?? 0) + Number(d.delivered_qty));
  }

  for (const it of input.items) {
    const item = itemMap.get(it.order_item_id);
    if (!item) return { error: t("itemNotInOrder", { name: it.product_name }) };
    const delivered = deliveredMap.get(it.order_item_id) ?? 0;
    const remaining = Number(item.quantity) - delivered;
    if (it.delivered_qty > remaining) {
      return { error: t("itemRemaining", { name: item.product_name, remaining, delivered, total: item.quantity }) };
    }
  }

  const delivery_code = input.pgh_code?.trim() || await nextDeliveryCode(supabase, year);

  const { data: dn, error: dnErr } = await supabase
    .from("delivery_notes")
    .insert({
      delivery_code,
      order_id: input.order_id,
      delivery_date: input.delivery_date || null,
      customer_info: input.customer_info.trim() || null,
      responsible_person: input.responsible_person.trim() || null,
      responsible_phone: input.responsible_phone.trim() || null,
      receiver_name: input.receiver_name.trim() || null,
      receiver_phone: input.receiver_phone.trim() || null,
      pgh_code: input.pgh_code?.trim() || null,
      customer_id: input.customer_id || null,
      status: "delivered",
      created_by: ctx.user.id,
    })
    .select("id, delivery_code")
    .single();

  if (dnErr) return { error: dnErr.message };

  const { error: itemsErr } = await supabase.from("delivery_items").insert(
    input.items.map((it, i) => ({
      delivery_note_id: dn!.id,
      order_item_id: it.order_item_id,
      seq: i + 1,
      product_name: it.product_name.trim(),
      unit: it.unit || null,
      delivered_qty: it.delivered_qty,
    })),
  );
  if (itemsErr) {
    await supabase.from("delivery_notes").delete().eq("id", dn!.id);
    return { error: itemsErr.message };
  }

  revalidatePath("/delivery-notes");
  revalidatePath(`/purchase-orders/${input.order_id}`);
  redirect(`/delivery-notes/${dn!.id}`);
}

export async function deleteDelivery(id: string) {
  const ctx = await getCurrentUser();
  const t = await getTranslations("errors");
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();

  const { data: dn } = await supabase
    .from("delivery_notes")
    .select("order_id")
    .eq("id", id)
    .single();
  if (!dn) return { error: t("deliveryNoteNotFound") };

  const { error } = await supabase.from("delivery_notes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/delivery-notes");
  revalidatePath(`/purchase-orders/${dn.order_id}`);
  redirect("/delivery-notes");
}

export async function updateDelivery(id: string, input: CreateDeliveryInput) {
  const parsed = updateDeliverySchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();

  // Re-validate delivered_qty ≤ remaining (same as createDelivery)
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, quantity, product_name")
    .eq("order_id", input.order_id);
  const itemMap = new Map((orderItems ?? []).map((i) => [i.id, i]));

  const { data: deliveredData } = await supabase
    .from("delivery_items")
    .select("order_item_id, delivered_qty, delivery_notes!inner(status)")
    .in("order_item_id", (orderItems ?? []).map((i) => i.id));
  const deliveredMap = new Map<string, number>();
  for (const d of (deliveredData as unknown as Array<{
    order_item_id: string;
    delivered_qty: number;
    delivery_notes: Array<{ status: string }>;
  }> | null) ?? []) {
    const dn = Array.isArray(d.delivery_notes) ? d.delivery_notes[0] : d.delivery_notes;
    if (dn?.status === "cancelled") continue;
    deliveredMap.set(d.order_item_id, (deliveredMap.get(d.order_item_id) ?? 0) + Number(d.delivered_qty));
  }

  // Subtract this DN's own existing delivered qty from the running total
  const { data: existingItems } = await supabase
    .from("delivery_items")
    .select("order_item_id, delivered_qty")
    .eq("delivery_note_id", id);
  for (const ex of existingItems ?? []) {
    deliveredMap.set(ex.order_item_id, (deliveredMap.get(ex.order_item_id) ?? 0) - Number(ex.delivered_qty));
  }

  for (const it of input.items) {
    const item = itemMap.get(it.order_item_id);
    if (!item) return { error: t("itemNotInOrder", { name: it.product_name }) };
    const delivered = deliveredMap.get(it.order_item_id) ?? 0;
    const remaining = Number(item.quantity) - delivered;
    if (it.delivered_qty > remaining) {
      return { error: t("itemRemaining", { name: item.product_name, remaining, delivered, total: item.quantity }) };
    }
  }

  await supabase.from("delivery_notes").update({
    delivery_date: input.delivery_date || null,
    customer_info: input.customer_info.trim() || null,
    responsible_person: input.responsible_person.trim() || null,
    responsible_phone: input.responsible_phone.trim() || null,
    receiver_name: input.receiver_name.trim() || null,
    receiver_phone: input.receiver_phone.trim() || null,
    pgh_code: input.pgh_code?.trim() || null,
    customer_id: input.customer_id || null,
  }).eq("id", id);

  await supabase.from("delivery_items").delete().eq("delivery_note_id", id);
  await supabase.from("delivery_items").insert(
    input.items.map((it, i) => ({
      delivery_note_id: id,
      order_item_id: it.order_item_id,
      seq: i + 1,
      product_name: it.product_name.trim(),
      unit: it.unit || null,
      delivered_qty: it.delivered_qty,
    })),
  );
  revalidatePath("/delivery-notes");
  revalidatePath(`/delivery-notes/${id}`);
  revalidatePath(`/purchase-orders/${input.order_id}`);
  redirect(`/delivery-notes/${id}`);
}
