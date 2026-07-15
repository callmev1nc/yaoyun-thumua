"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createBuyerSchema, updateBuyerSchema } from "@/lib/validation";

export async function createBuyer(input: {
  name: string;
  phone?: string | null;
}) {
  const parsed = createBuyerSchema.safeParse(input);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("buyers").insert({
    name: parsed.data.name.trim(),
    phone: parsed.data.phone?.trim() || null,
    created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders/new");
  return { ok: true, id: data.id };
}

export async function updateBuyer(
  id: string,
  input: { name: string; phone?: string | null },
) {
  const parsed = updateBuyerSchema.safeParse(input);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("buyers")
    .update({
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders/new");
  return { ok: true };
}

export async function deleteBuyer(id: string) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("buyers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders/new");
  return { ok: true };
}
