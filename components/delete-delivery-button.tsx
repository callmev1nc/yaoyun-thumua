"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { deleteDelivery } from "@/lib/actions/delivery";
import { Button } from "@/components/ui/button";

export function DeleteDeliveryButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("common");
  const tc = useTranslations("confirm");

  function handleDelete() {
    if (!confirm(tc("deleteDn"))) return;
    startTransition(async () => {
      const res = await deleteDelivery(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        router.push("/delivery-notes");
      }
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
