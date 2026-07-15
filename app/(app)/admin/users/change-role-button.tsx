"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const nextRole: UserRole = currentRole === "admin" ? "staff" : "admin";
  const label = currentRole === "admin" ? "Giáng xuống NV" : "Nâng lên Admin";

  function handleClick() {
    if (!confirm(`Chuyển vai trò người dùng này thành "${nextRole === "admin" ? "Admin" : "Nhân viên"}"?`)) return;
    startTransition(async () => {
      const res = await updateUserRole(userId, nextRole);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Đã đổi vai trò");
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
