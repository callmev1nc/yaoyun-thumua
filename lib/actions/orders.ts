"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { installmentAmount } from "@/lib/calc";
import { createOrderSchema } from "@/lib/validation";
import type { OrderStatus } from "@/types/db";

export interface OrderItemInput {
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_percent: number;
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
    // Strip the "YY{year}" prefix and parse ONLY the trailing sequence number.
    // Otherwise "YY202600001" would parse as 202600001 (year included) and the
    // next code would come out as "YY2026202600002" instead of "YY202600002".
    const seq = parseInt((r.order_code ?? "").slice(prefix.length), 10);
    if (!Number.isNaN(seq)) max = Math.max(max, seq);
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

// Sinh mã đơn đặt PO{body}-{NN}. body = chữ số trong mã dự án.
// NN = (suffix lớn nhất trong các đơn cùng project_code) + 1.
// VD project_code "YY202603005" -> "PO202603005-01", "-02"...
async function nextPoCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectCode: string,
): Promise<string | null> {
  const body = projectCode.replace(/\D/g, ""); // chỉ giữ chữ số
  if (!body) return null; // mã dự án không có số -> không sinh mã đơn đặt
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
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  if (!input.items.length) return { error: "Phải có ít nhất 1 dòng sản phẩm" };

  const supabase = await createClient();
  const year = new Date().getFullYear();
  const order_code = (input.order_code?.trim() || (await nextOrderCode(supabase, year))).trim();

  const projectCode = input.project_code?.trim() || null;
  const po_code = projectCode ? await nextPoCode(supabase, projectCode) : null;

  // 1. Create the order header (totals default 0; trigger recomputes on item insert).
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

  // 2. Insert items → trigger recomputes order totals.
  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((it, i) => ({
      order_id: order!.id,
      seq: i + 1,
      product_name: it.product_name.trim(),
      unit: it.unit.trim() || null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      vat_rate: it.vat_rate,
      discount_percent: it.discount_percent,
    })),
  );
  if (itemsErr) {
    await supabase.from("purchase_orders").delete().eq("id", order!.id);
    return { error: itemsErr.message };
  }

  // 3. Read recomputed grand total, then insert payments with computed amounts.
  const { data: fresh } = await supabase
    .from("purchase_orders")
    .select("grand_total")
    .eq("id", order!.id)
    .single();
  if (!fresh) {
    return { error: "Lỗi tính tổng đơn, vui lòng thử lại" };
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

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${order!.id}`);
}

export async function deleteOrder(id: string) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

export async function duplicateOrder(id: string) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();

  const { data: orig } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (!orig) return { error: "Không tìm thấy đơn hàng" };

  const { data: origItems } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("seq");
  const items = (origItems ?? []) as Array<{
    product_name: string; unit: string | null; quantity: number;
    unit_price: number; vat_rate: number; discount_percent: number;
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
      discount_percent: it.discount_percent,
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
    return { error: "Lỗi tính tổng đơn, vui lòng thử lại" };
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
