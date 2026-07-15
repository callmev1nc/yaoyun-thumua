"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteOrder } from "@/lib/actions/orders";
import { toast } from "sonner";

export function DeleteOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="icon"
      disabled={pending}
      title="Xoá đơn"
      onClick={() => {
        if (!confirm("Xoá đơn đặt hàng này? Hành động không thể hoàn tác.")) return;
        start(async () => {
          const res = await deleteOrder(id);
          if (res?.error) toast.error(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
