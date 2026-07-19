"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { resetUserPassword } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("users");
  const tf = useTranslations("confirm");
  const tt = useTranslations("toasts");
  const te = useTranslations("errors");

  function handleClick() {
    const newPw = prompt(tf("promptNewPassword"));
    if (!newPw || newPw.length < 6) {
      if (newPw) toast.error(te("passwordMinLength"));
      return;
    }
    if (!confirm(tf("confirmResetPassword"))) return;

    startTransition(async () => {
      const res = await resetUserPassword(userId, newPw);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(tt("passwordReset"));
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
      {t("resetPasswordButton")}
    </Button>
  );
}
