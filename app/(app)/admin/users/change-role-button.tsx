"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateUserRole } from "@/lib/actions/admin";
import type { UserRole } from "@/types/db";
import { Button } from "@/components/ui/button";

export function ChangeRoleButton({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: UserRole;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tRoles = useTranslations("roles");
  const tConfirm = useTranslations("confirm");
  const tToasts = useTranslations("toasts");
  const nextRole: UserRole = currentRole === "admin" ? "staff" : "admin";
  const label = currentRole === "admin" ? tRoles("demoteToStaff") : tRoles("promoteToAdmin");

  function handleClick() {
    const roleLabel = nextRole === "admin" ? tRoles("admin") : tRoles("staff");
    if (!confirm(tConfirm("changeRole", { role: roleLabel }))) return;
    startTransition(async () => {
      const res = await updateUserRole(userId, nextRole);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(tToasts("roleChanged"));
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || pending}
    >
      {label}
    </Button>
  );
}
