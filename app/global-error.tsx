"use client";

import { useEffect } from "react";

/**
 * Catches throws from the root layout (app/layout.tsx) and from any segment
 * layout whose own error.tsx does not wrap it (e.g. app/(app)/layout.tsx ->
 * requireUser -> createClient). Replaces the root layout entirely, so it must
 * render its own <html>/<body> and cannot rely on globals.css / providers.
 * Inline styles only.
 *
 * The `error.digest` is shown so it can be matched in the Vercel runtime logs
 * to find the real server-side stack trace.
 */
export default function GlobalError({
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
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          padding: "48px 24px",
          background: "#f6f7f9",
          color: "#111",
          fontFamily:
            'ui-sans-serif, system-ui, "Noto Sans TC", "Noto Sans SC", sans-serif',
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 32,
            boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 20 }}>
            系統發生錯誤 / Đã xảy ra lỗi
          </h2>
          <p style={{ color: "#555", fontSize: 14 }}>
            請稍後重試；若問題持續，請聯絡管理員並提供下方的錯誤代碼。
            <br />
            Vui lòng thử lại. Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ quản trị viên
            kèm theo mã lỗi bên dưới.
          </p>
          {error?.digest ? (
            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "6px 10px",
                wordBreak: "break-all",
              }}
            >
              digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 600,
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            重試 / Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
