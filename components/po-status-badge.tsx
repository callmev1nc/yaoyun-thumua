"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/db";

const COLOR: Record<OrderStatus, string> = {
  draft: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  closed: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
};

const VARIANT: Record<OrderStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  confirmed: "default",
  closed: "outline",
};

export function POStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("status.po");
  return (
    <Badge variant={VARIANT[status] ?? "secondary"} className={COLOR[status] ?? ""}>
      {t(status)}
    </Badge>
  );
}
