"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  colSpan,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
  className?: string;
}) {
  const t = useTranslations("common");
  const resolvedTitle = title ?? t("empty");

  const content = (
    <td colSpan={colSpan} className={cn("p-8 text-center", className)}>
      <div className="mx-auto flex flex-col items-center gap-2 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{resolvedTitle}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </td>
  );

  return <tr>{content}</tr>;
}
