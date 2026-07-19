import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { SuppliersManager } from "@/components/suppliers-manager";
import type { Supplier } from "@/types/db";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const t = await getTranslations("suppliers");
  const locale = await getLocale() as Locale;
  const { data } = await supabase
    .from("suppliers")
    .select("id, company_name, contact_person, phone")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <SuppliersManager suppliers={(data as Supplier[]) ?? []} />
    </div>
  );
}
