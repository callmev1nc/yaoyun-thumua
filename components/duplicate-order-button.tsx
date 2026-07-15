"use client";

import { useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateOrder } from "@/lib/actions/orders";
import { toast } from "sonner";

export function DuplicateOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      title="Sao chép đơn"
      onClick={() => {
        if (!confirm("Sao chép thành đơn nháp mới?")) return;
        start(async () => {
          const res = await duplicateOrder(id);
          if (res?.error) toast.error(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
      Sao chép
    </Button>
  );
}
