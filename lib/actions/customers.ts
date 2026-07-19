"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validation";

export async function createCustomer(input: {
  company_name: string;
  address?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
}) {
  const parsed = createCustomerSchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") + ": " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();

  const escapedName = parsed.data.company_name
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .ilike("company_name", escapedName)
    .maybeSingle();
  if (existing) {
    const { error: upErr } = await supabase
      .from("customers")
      .update({
        address: parsed.data.address?.trim() || null,
        contact_name: parsed.data.contact_name?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        receiver_name: parsed.data.receiver_name?.trim() || null,
        receiver_phone: parsed.data.receiver_phone?.trim() || null,
      })
      .eq("id", existing.id);
    if (upErr) return { error: upErr.message };
    revalidatePath("/customers");
    revalidatePath("/purchase-orders/new");
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabase.from("customers").insert({
    company_name: parsed.data.company_name.trim(),
    address: parsed.data.address?.trim() || null,
    contact_name: parsed.data.contact_name?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    receiver_name: parsed.data.receiver_name?.trim() || null,
    receiver_phone: parsed.data.receiver_phone?.trim() || null,
    created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/customers");
  revalidatePath("/purchase-orders/new");
  return { ok: true, id: data.id };
}

export async function updateCustomer(
  id: string,
  input: {
    company_name: string;
    address?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    receiver_name?: string | null;
    receiver_phone?: string | null;
  },
) {
  const parsed = updateCustomerSchema.safeParse(input);
  const t = await getTranslations("errors");
  if (!parsed.success) return { error: t("invalidData") + ": " + parsed.error.issues.map((i) => i.message).filter(Boolean).join(", ") };
  const ctx = await getCurrentUser();
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      company_name: parsed.data.company_name.trim(),
      address: parsed.data.address?.trim() || null,
      contact_name: parsed.data.contact_name?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      receiver_name: parsed.data.receiver_name?.trim() || null,
      receiver_phone: parsed.data.receiver_phone?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  const ctx = await getCurrentUser();
  const t = await getTranslations("errors");
  if (!ctx) return { error: t("notLoggedIn") };
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}
