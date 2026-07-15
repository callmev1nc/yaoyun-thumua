"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function createCustomer(input: {
  company_name: string;
  address?: string | null;
}) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    company_name: input.company_name.trim(),
    address: input.address?.trim() || null,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}

export async function updateCustomer(
  id: string,
  input: { company_name: string; address?: string | null },
) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      company_name: input.company_name.trim(),
      address: input.address?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}
