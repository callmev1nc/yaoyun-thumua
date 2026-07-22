"use client";

import { useEffect } from "react";

/**
 * Boundary for printable documents (opened in a new tab via /print/po/[id] and
 * /print/dn/[id]). Minimal — no sidebar, no auto window.print(). Shows the
 * digest so the team can locate the real error in the Vercel logs.
 */
export default function PrintError({
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
    <div
      style={{
        maxWidth: 480,
        margin: "64px auto",
        padding: 32,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        fontFamily:
          'ui-sans-serif, system-ui, "Noto Sans TC", "Noto Sans SC", sans-serif',
        color: "#111",
        lineHeight: 1.6,
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 20 }}>
        無法載入文件 / Không tải được chứng từ
      </h2>
      <p style={{ color: "#555", fontSize: 14 }}>
        列印文件時發生錯誤，請關閉此分頁後再從詳情頁重新開啟。
        <br />
        Đã xảy ra lỗi khi tải chứng từ. Vui lòng đóng tab này và mở lại từ trang
        chi tiết.
      </p>
      {error?.digest ? (
        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
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
  );
}
