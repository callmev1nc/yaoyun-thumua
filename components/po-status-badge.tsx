import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/db";

const MAP: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Nháp", variant: "secondary" },
  confirmed: { label: "Đã duyệt", variant: "default" },
  closed: { label: "Đã đóng", variant: "outline" },
};

// Extend with semantic color via className
const COLOR: Record<OrderStatus, string> = {
  draft: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  closed: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
};

export function POStatusBadge({ status }: { status: OrderStatus }) {
  const s = MAP[status] ?? { label: status, variant: "secondary" as const };
  const color = COLOR[status] ?? "";
  return <Badge variant={s.variant} className={color}>{s.label}</Badge>;
}
