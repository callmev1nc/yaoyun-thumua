import { requireUser } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const ctx = await requireUser();
  const t = await getTranslations("settings");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SettingsForm initialName={ctx.profile?.full_name ?? ""} />
    </div>
  );
}
