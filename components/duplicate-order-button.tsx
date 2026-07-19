"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateOrder } from "@/lib/actions/orders";
import { toast } from "sonner";

export function DuplicateOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const t = useTranslations("orders");
  const tc = useTranslations("confirm");
  return (
    <Button
      variant="outline"
      disabled={pending}
      title={t("duplicate")}
      onClick={() => {
        if (!confirm(tc("duplicate"))) return;
        start(async () => {
          const res = await duplicateOrder(id);
          if (res?.error) toast.error(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
      {t("duplicate")}
    </Button>
  );
}
