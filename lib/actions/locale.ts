"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { locales, type Locale } from "@/i18n/request";

export async function setLocale(locale: string) {
  if (!(locales as readonly string[]).includes(locale)) return;
  const store = await cookies();
  store.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ preferred_language: locale }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}
