"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupplierSchema, updateSupplierSchema } from "@/lib/validation";

export async function createSupplier(input: {
  company_name: string;
  contact_person?: string | null;
  phone?: string | null;
}) {
  const parsed = createSupplierSchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") + ": " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").insert({
    company_name: parsed.data.company_name.trim(),
    contact_person: parsed.data.contact_person?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  revalidatePath("/purchase-orders/new");
  return { ok: true, id: data.id };
}

export async function updateSupplier(
  id: string,
  input: { company_name: string; contact_person?: string | null; phone?: string | null },
) {
  const parsed = updateSupplierSchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") + ": " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      company_name: parsed.data.company_name.trim(),
      contact_person: parsed.data.contact_person?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { ok: true };
}

export async function deleteSupplier(id: string) {
  const ctx = await getCurrentUser();
  const t = await getTranslations("errors");
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { ok: true };
}
