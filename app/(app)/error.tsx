"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Boundary for the authenticated app shell. The sidebar (rendered by
 * (app)/layout.tsx) stays visible because the layout sits outside this
 * boundary. Hardcoded bilingual text (no useTranslations) so the boundary
 * itself can never throw — e.g. if i18n were the cause of the error.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-3 p-8 text-center">
          <h2 className="text-xl font-semibold">
            無法載入此頁面 / Không tải được trang này
          </h2>
          <p className="text-sm text-muted-foreground">
            系統暫時無法取得資料，請重試。
            <br />
            Hệ thống tạm thời không lấy được dữ liệu, vui lòng thử lại.
          </p>
          {error?.digest ? (
            <p className="break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              digest: {error.digest}
            </p>
          ) : null}
          <Button onClick={reset} className="mt-2">
            重試 / Thử lại
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
