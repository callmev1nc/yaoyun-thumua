"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { installmentAmount } from "@/lib/calc";
import { createOrderSchema, updateOrderSchema } from "@/lib/validation";
import type { OrderStatus } from "@/types/db";

export interface OrderItemInput {
  id?: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface PaymentInput {
  percent: number;
  planned_date: string | null;
  status: "unpaid" | "paid";
  paid_date: string | null;
}

export interface CreateOrderInput {
  order_code?: string | null;
  supplier_id: string | null;
  supplier_company: string;
  supplier_contact: string;
  supplier_phone: string;
  buyer_name: string;
  buyer_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  customer_id: string | null;
  customer_company?: string;
  project_code?: string | null;
  delivery_date: string | null;
  status: OrderStatus;
  note: string;
  items: OrderItemInput[];
  payments: PaymentInput[];
}

async function nextOrderCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
): Promise<string> {
  const prefix = `YY${year}`;
  const { data } = await supabase
    .from("purchase_orders")
    .select("order_code")
    .like("order_code", `${prefix}%`);

  let max = 0;
  for (const r of data ?? []) {
    const seq = parseInt((r.order_code ?? "").slice(prefix.length), 10);
    if (!Number.isNaN(seq)) max = Math.max(max, seq);
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

async function nextPoCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectCode: string,
): Promise<string | null> {
  const body = projectCode.replace(/\D/g, "");
  if (!body) return null;
  const { data } = await supabase
    .from("purchase_orders")
    .select("po_code")
    .eq("project_code", projectCode.trim());
  let max = 0;
  for (const r of data ?? []) {
    const m = (r.po_code ?? "").match(/-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `PO${body}-${String(max + 1).padStart(2, "0")}`;
}

export async function createOrder(input: CreateOrderInput) {
  const parsed = createOrderSchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") + ": " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  if (!input.items.length) return { error: t("needOneItem") };

  const supabase = await createClient();
  const year = new Date().getFullYear();
  const order_code = (input.order_code?.trim() || (await nextOrderCode(supabase, year))).trim();

  const projectCode = input.project_code?.trim() || null;
  const po_code = projectCode ? await nextPoCode(supabase, projectCode) : null;

  const { data: order, error: orderErr } = await supabase
    .from("purchase_orders")
    .insert({
      order_code,
      supplier_id: input.supplier_id || null,
      supplier_company: input.supplier_company.trim() || null,
      supplier_contact: input.supplier_contact.trim() || null,
      supplier_phone: input.supplier_phone.trim() || null,
      buyer_name: input.buyer_name.trim() || null,
      buyer_phone: input.buyer_phone.trim() || null,
      receiver_name: input.receiver_name.trim() || null,
      receiver_phone: input.receiver_phone.trim() || null,
      receiver_address: input.receiver_address.trim() || null,
      customer_id: input.customer_id || null,
      customer_company: input.customer_company?.trim() || null,
      project_code: projectCode,
      po_code,
      delivery_date: input.delivery_date || null,
      status: input.status,
      note: input.note.trim() || null,
      created_by: ctx.user.id,
    })
    .select("id, order_code")
    .single();

  if (orderErr) return { error: orderErr.message };

  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((it, i) => ({
      order_id: order!.id,
      seq: i + 1,
      product_name: it.product_name.trim(),
      unit: it.unit.trim() || null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      vat_rate: it.vat_rate,
    })),
  );
  if (itemsErr) {
    await supabase.from("purchase_orders").delete().eq("id", order!.id);
    return { error: itemsErr.message };
  }

  const { data: fresh } = await supabase
    .from("purchase_orders")
    .select("grand_total")
    .eq("id", order!.id)
    .single();
  if (!fresh) {
    return { error: t("calcError") };
  }
  const grandTotal = fresh.grand_total;

  if (input.payments.length) {
    const { error: payErr } = await supabase.from("payment_schedules").insert(
      input.payments.map((p, i) => ({
        order_id: order!.id,
        installment_no: i + 1,
        percent: p.percent,
        planned_date: p.planned_date || null,
        status: p.status,
        paid_date: p.paid_date || null,
        amount: installmentAmount(grandTotal, p.percent),
      })),
    );
    if (payErr) {
      await supabase.from("order_items").delete().eq("order_id", order!.id);
      await supabase.from("purchase_orders").delete().eq("id", order!.id);
      return { error: payErr.message };
    }
  }

  // Remember last-used values for this user (non-fatal — order is already saved).
  await supabase
    .from("profiles")
    .update({
      last_supplier_id: input.supplier_id || null,
      last_customer_id: input.customer_id || null,
      last_buyer_name: input.buyer_name.trim() || null,
      last_buyer_phone: input.buyer_phone.trim() || null,
      default_vat_rate: input.items[0]?.vat_rate ?? null,
      default_payment_schedule: input.payments.map((p) => p.percent),
    })
    .eq("id", ctx.user.id);

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${order!.id}`);
}

export async function deleteOrder(id: string) {
  const ctx = await getCurrentUser();
  const t = await getTranslations("errors");
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();

  // Block deletion if any delivery note exists for this order (any status).
  const { count } = await supabase
    .from("delivery_notes")
    .select("id", { count: "exact", head: true })
    .eq("order_id", id);
  if ((count ?? 0) > 0) return { error: t("orderHasDeliveries") };

  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

export async function duplicateOrder(id: string) {
  const ctx = await getCurrentUser();
  const t = await getTranslations("errors");
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();

  const { data: orig } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (!orig) return { error: t("orderNotFound") };

  const { data: origItems } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("seq");
  const items = (origItems ?? []) as Array<{
    product_name: string; unit: string | null; quantity: number;
    unit_price: number; vat_rate: number;
  }>;

  const { data: origPayments } = await supabase
    .from("payment_schedules")
    .select("*")
    .eq("order_id", id)
    .order("installment_no");
  const payments = (origPayments ?? []) as Array<{
    percent: number; planned_date: string | null;
  }>;

  const year = new Date().getFullYear();
  const order_code = await nextOrderCode(supabase, year);
  const dupPoCode = orig.project_code ? await nextPoCode(supabase, orig.project_code) : null;

  const { data: order, error: orderErr } = await supabase
    .from("purchase_orders")
    .insert({
      order_code,
      supplier_id: orig.supplier_id,
      supplier_company: orig.supplier_company,
      supplier_contact: orig.supplier_contact,
      supplier_phone: orig.supplier_phone,
      buyer_name: orig.buyer_name,
      buyer_phone: orig.buyer_phone,
      receiver_name: orig.receiver_name,
      receiver_phone: orig.receiver_phone,
      receiver_address: orig.receiver_address,
      customer_id: orig.customer_id,
      customer_company: orig.customer_company,
      project_code: orig.project_code,
      po_code: dupPoCode,
      delivery_date: orig.delivery_date,
      note: orig.note,
      status: "draft",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (orderErr) return { error: orderErr.message };

  const { error: itemsErr } = await supabase.from("order_items").insert(
    items.map((it, i) => ({
      order_id: order.id,
      seq: i + 1,
      product_name: it.product_name,
      unit: it.unit,
      quantity: it.quantity,
      unit_price: it.unit_price,
      vat_rate: it.vat_rate,
    })),
  );
  if (itemsErr) {
    await supabase.from("purchase_orders").delete().eq("id", order.id);
    return { error: itemsErr.message };
  }

  const { data: fresh } = await supabase
    .from("purchase_orders")
    .select("grand_total")
    .eq("id", order.id)
    .single();
  if (!fresh) {
    return { error: t("calcError") };
  }

  if (payments.length) {
    const { error: payErr } = await supabase.from("payment_schedules").insert(
      payments.map((p, i) => ({
        order_id: order.id,
        installment_no: i + 1,
        percent: p.percent,
        planned_date: p.planned_date || null,
        status: "unpaid",
        paid_date: null,
        amount: installmentAmount(fresh.grand_total, p.percent),
      })),
    );
    if (payErr) {
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("purchase_orders").delete().eq("id", order.id);
      return { error: payErr.message };
    }
  }

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${order.id}`);
}

export async function updateOrder(id: string, input: CreateOrderInput) {
  const parsed = updateOrderSchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();

  const projectCode = input.project_code?.trim() || null;

  await supabase.from("purchase_orders").update({
    supplier_id: input.supplier_id || null,
    supplier_company: input.supplier_company.trim() || null,
    supplier_contact: input.supplier_contact.trim() || null,
    supplier_phone: input.supplier_phone.trim() || null,
    buyer_name: input.buyer_name.trim() || null,
    buyer_phone: input.buyer_phone.trim() || null,
    receiver_name: input.receiver_name.trim() || null,
    receiver_phone: input.receiver_phone.trim() || null,
    receiver_address: input.receiver_address.trim() || null,
    customer_id: input.customer_id || null,
    customer_company: input.customer_company?.trim() || null,
    project_code: projectCode,
    delivery_date: input.delivery_date || null,
    status: input.status,
    note: input.note.trim() || null,
  }).eq("id", id);

  // Items: when the order already has deliveries we MUST edit rows in place,
  // because delivery_items.order_item_id is ON DELETE CASCADE — bulk-deleting
  // order_items would wipe the delivery history.
  const { data: existingDeliveries } = await supabase
    .from("delivery_notes")
    .select("id")
    .eq("order_id", id)
    .neq("status", "cancelled")
    .limit(1);
  const hasDeliveries = (existingDeliveries ?? []).length > 0;

  const { data: existing } = await supabase.from("order_items").select("id").eq("order_id", id);
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const submittedIds = new Set(input.items.map((it) => it.id).filter(Boolean) as string[]);

  if (hasDeliveries) {
    // 1. Delete removed items — but only if nothing has been delivered against them.
    for (const oid of existingIds) {
      if (!submittedIds.has(oid)) {
        const { data: delData } = await supabase.rpc("delivered_total", { p_order_item_id: oid });
        const delivered = Number(delData) || 0;
        if (delivered > 0) {
          return { error: t("cannotDeleteDeliveredRow") };
        }
        await supabase.from("order_items").delete().eq("id", oid);
      }
    }
    // 2. Update existing rows in place + insert new ones, preserving submitted order via seq.
    let seq = 0;
    for (const it of input.items) {
      seq++;
      if (it.id && existingIds.has(it.id)) {
        await supabase.from("order_items").update({
          seq,
          product_name: it.product_name.trim(),
          unit: it.unit.trim() || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          vat_rate: it.vat_rate,
        }).eq("id", it.id);
      } else {
        await supabase.from("order_items").insert({
          order_id: id,
          seq,
          product_name: it.product_name.trim(),
          unit: it.unit.trim() || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          vat_rate: it.vat_rate,
        });
      }
    }
  } else {
    // No deliveries — safe to bulk replace.
    await supabase.from("order_items").delete().eq("order_id", id);
    let seq = 0;
    for (const it of input.items) {
      seq++;
      await supabase.from("order_items").insert({
        order_id: id,
        seq,
        product_name: it.product_name.trim(),
        unit: it.unit.trim() || null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        vat_rate: it.vat_rate,
      });
    }
  }

  // Payments: safe to replace (no FK from deliveries)
  await supabase.from("payment_schedules").delete().eq("order_id", id);
  const { data: fresh } = await supabase.from("purchase_orders").select("grand_total").eq("id", id).single();
  if (input.payments.length) {
    await supabase.from("payment_schedules").insert(
      input.payments.map((p, i) => ({
        order_id: id,
        installment_no: i + 1,
        percent: p.percent,
        planned_date: p.planned_date || null,
        status: p.status,
        paid_date: p.paid_date || null,
        amount: installmentAmount(fresh!.grand_total, p.percent),
      })),
    );
  }
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/ledger");
  redirect(`/purchase-orders/${id}`);
}
