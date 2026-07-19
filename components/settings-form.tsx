"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { updateProfile } from "@/lib/actions/profile";

const THEMES = [
  { value: "light", labelKey: "themeLight", Icon: Sun },
  { value: "dark", labelKey: "themeDark", Icon: Moon },
  { value: "system", labelKey: "themeSystem", Icon: Monitor },
] as const;

export function SettingsForm({ initialName }: { initialName: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, start] = useTransition();
  const t = useTranslations("settings");

  // next-themes hydration guard: theme is undefined on the server, so we only
  // render theme-dependent UI after mount to avoid a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function saveName() {
    start(async () => {
      const res = await updateProfile({ full_name: name });
      if (res?.error) toast.error(res.error);
      else toast.success(t("saved"));
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>{t("theme")}</Label>
          <div className="flex flex-wrap gap-2">
            {THEMES.map(({ value, labelKey, Icon }) => {
              const active = mounted && theme === value;
              return (
                <Button
                  key={value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  disabled={!mounted}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="mr-2 size-4" />
                  {t(labelKey)}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="name">{t("displayName")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="button" disabled={pending} onClick={saveName}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
