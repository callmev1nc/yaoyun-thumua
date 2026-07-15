"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function createSupplier(input: {
  company_name: string;
  contact_person?: string | null;
  phone?: string | null;
}) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    company_name: input.company_name.trim(),
    contact_person: input.contact_person?.trim() || null,
    phone: input.phone?.trim() || null,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { ok: true };
}

export async function updateSupplier(
  id: string,
  input: { company_name: string; contact_person?: string | null; phone?: string | null },
) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      company_name: input.company_name.trim(),
      contact_person: input.contact_person?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { ok: true };
}

export async function deleteSupplier(id: string) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { ok: true };
}
