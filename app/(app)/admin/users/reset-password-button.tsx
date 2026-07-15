"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resetUserPassword } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const newPw = prompt("Nhập mật khẩu mới (ít nhất 6 ký tự):");
    if (!newPw || newPw.length < 6) {
      if (newPw) toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (!confirm(`Xác nhận đặt lại mật khẩu cho người dùng này?`)) return;

    startTransition(async () => {
      const res = await resetUserPassword(userId, newPw);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Đã đặt lại mật khẩu");
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      Đổi mật khẩu
    </Button>
  );
}
