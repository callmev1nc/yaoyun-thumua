"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createProductSchema, updateProductSchema } from "@/lib/validation";

export async function createProduct(input: {
  name: string;
  sku?: string | null;
  default_unit?: string | null;
  default_price: number;
  default_vat_rate: number;
  note?: string | null;
}) {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();

  // Soft-dedup: case-insensitive name match → return existing id.
  // Escape LIKE wildcards so names containing % _ \ match literally.
  const escaped = parsed.data.name
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .ilike("name", escaped)
    .maybeSingle();
  if (existing) return { ok: true, id: existing.id };

  const { data, error } = await supabase.from("products").insert({
    name: parsed.data.name.trim(),
    sku: parsed.data.sku?.trim() || null,
    default_unit: parsed.data.default_unit?.trim() || null,
    default_price: parsed.data.default_price,
    default_vat_rate: parsed.data.default_vat_rate,
    note: parsed.data.note?.trim() || null,
    created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders/new");
  return { ok: true, id: data.id };
}

export async function updateProduct(
  id: string,
  input: {
    name: string;
    sku?: string | null;
    default_unit?: string | null;
    default_price: number;
    default_vat_rate: number;
    note?: string | null;
  },
) {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name.trim(),
      sku: parsed.data.sku?.trim() || null,
      default_unit: parsed.data.default_unit?.trim() || null,
      default_price: parsed.data.default_price,
      default_vat_rate: parsed.data.default_vat_rate,
      note: parsed.data.note?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders/new");
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders/new");
  return { ok: true };
}
