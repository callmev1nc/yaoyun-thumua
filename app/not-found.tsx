import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold tracking-tight text-muted-foreground">
        404
      </p>
      <div className="space-y-1">
        <p className="text-lg font-semibold">找不到頁面 / Không tìm thấy trang</p>
        <p className="text-sm text-muted-foreground">
          此記錄可能已被刪除或連結無效。
          <br />
          Bản ghi có thể đã bị xoá hoặc đường dẫn không hợp lệ.
        </p>
      </div>
      <Button asChild>
        <Link href="/">返回首頁 / Về trang chủ</Link>
      </Button>
    </div>
  );
}
