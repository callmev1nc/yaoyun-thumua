"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(input: { full_name: string }) {
  const t = await getTranslations("errors");
  const full_name = input.full_name.trim();
  if (!full_name) return { error: t("invalidData") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notLoggedIn") };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}
