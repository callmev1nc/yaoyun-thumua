import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["vi", "zh-Hant", "zh-Hans"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh-Hant";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookie = store.get("locale")?.value;
  const locale: Locale = (locales as readonly string[]).includes(cookie ?? "")
    ? (cookie as Locale)
    : defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
