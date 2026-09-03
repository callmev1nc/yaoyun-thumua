import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { BuyersManager } from "@/components/buyers-manager";
import type { Buyer } from "@/types/db";

export default async function BuyersPage() {
  const supabase = await createClient();
  const t = await getTranslations("buyers");
  const { data } = await supabase
    .from("buyers")
    .select("id, name, phone")
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
      <BuyersManager buyers={(data as Buyer[]) ?? []} />
    </div>
  );
}
