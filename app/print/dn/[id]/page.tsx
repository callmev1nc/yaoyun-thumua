import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/request";
import viMessages from "@/messages/vi.json";
import zhHantMessages from "@/messages/zh-Hant.json";
import zhHansMessages from "@/messages/zh-Hans.json";
import type { DeliveryNote, DeliveryItem } from "@/types/db";
import { PrintDeliveryNote } from "@/components/print/print-delivery-note";

export const dynamic = "force-dynamic";

export default async function PrintDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale() as Locale;

  const { data: dn } = await supabase
    .from("delivery_notes")
    .select("*, purchase_orders(order_code, project_code, po_code)")
    .eq("id", id)
    .single();
  if (!dn) notFound();

  const { data: itemsData } = await supabase
    .from("delivery_items")
    .select("*")
    .eq("delivery_note_id", id)
    .order("seq");
  const items = (itemsData as DeliveryItem[]) ?? [];

  const po = (dn as unknown as { purchase_orders: { order_code: string; project_code: string | null; po_code: string | null } }).purchase_orders;

  const cnVariant: Locale = locale === "zh-Hans" ? "zh-Hans" : "zh-Hant";
  const cnMessages = cnVariant === "zh-Hans" ? zhHansMessages : zhHantMessages;
  const tVn = createTranslator({ locale: "vi", messages: viMessages, namespace: "print" });
  const tCn = createTranslator({ locale: cnVariant, messages: cnMessages, namespace: "print" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translate = (t: any) => (key: string, values?: Record<string, any>) => t(key, values);

  return (
    <PrintDeliveryNote
      note={dn as DeliveryNote}
      items={items}
      orderCode={po?.order_code}
      projectCode={po?.project_code}
      poCode={po?.po_code}
      tCn={translate(tCn)}
      tVn={translate(tVn)}
      locale={locale}
    />
  );
}
