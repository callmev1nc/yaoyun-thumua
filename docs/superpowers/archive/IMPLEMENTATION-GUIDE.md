# Hướng dẫn tự implement phần còn lại

> ⚠️ **ĐÃ LỖI THỜI — guide build cũ (lưu 2026-07-21).** Phase 5–7 dưới đây **đã ship hết**. Pattern mã phiếu giao trong file này (`DN…`, `count+1`, `padStart 4`) **đã cũ và sai** — code thật (`lib/actions/delivery.ts`) dùng `GH{year}{seq}` + `like(prefix%)` + `padStart(5)`. Chỉ giữ để tham khảo lịch sử; đừng copy code mẫu. Xem `docs/FEATURES.md` cho hiện trạng Delivery/Ledger/Admin.

App đã chạy được (login, suppliers, tạo ĐH, tính tiền đúng). Bạn tự làm Phase 5→7 theo guide này; mình fix/debug sau. Mọi pattern đều có sẵn file mẫu — copy rồi đổi.

## Lệnh thường dùng
```bash
cd d:/Project/Yao_Yun/yaoyun-thumua
npm run dev              # chạy app: http://localhost:3000
npx tsc --noEmit         # kiểm tra type (chạy trước khi báo "xong")
```
Login test: `admin@yaoyun.vn / <rotated-strong-password>` (rotate after deploy; never commit the real password)

## Pattern đã dựng (dùng làm khuôn)
| Việc | File mẫu để copy |
|---|---|
| Trang list (server fetch → client component) | `app/(app)/suppliers/page.tsx` + `components/suppliers-manager.tsx` |
| Server action (create/update/delete) | `lib/actions/suppliers.ts` |
| Form phức tạp (client, tính toán realtime) | `components/forms/purchase-order-form.tsx` |
| Trang detail (dynamic `[id]`, await params) | `app/(app)/purchase-orders/[id]/page.tsx` |
| In A4 (route riêng + component + CSS `.pp-*`) | `app/print/po/[id]/page.tsx` + `components/print/print-purchase-order.tsx` |
| Toán tiền / format | `lib/calc.ts`, `lib/number-format.ts` |
| Kiểu DB | `types/db.ts` |

**Quy tắc Next 16 quan trọng:** `cookies()`, `params`, `searchParams` đều **async** → phải `await`. Đã làm đúng trong các file mẫu — cứ theo đó.

---

## Phase 4 — hoàn thiện (nhỏ)
1. Chạy app, vào `/purchase-orders/new`, điền 2 dòng (VAT 8/10 + CK), bấm **Lưu đơn** → phải sang trang detail.
2. Sửa cột "Chưa VAT" ở `components/forms/purchase-order-form.tsx`: đang dùng `lineGross`, đổi thành `netBeforeVat` (import thêm từ `@/lib/calc`) cho khớp cột in.
3. Mở **In đơn** (`/print/po/[id]`) → Ctrl+P → Save as PDF → so với `../Form 1.pdf`.

---

## Phase 5 — Phiếu giao hàng (Form 2)

### 5a. Action — `lib/actions/delivery.ts`
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface DeliveryLineInput {
  order_item_id: string;
  product_name: string;
  unit: string;
  delivered_qty: number;
}

export async function createDeliveryNote(input: {
  order_id: string;
  delivery_date: string | null;
  customer_info: string;
  responsible_person: string;
  responsible_phone: string;
  receiver_name: string;
  receiver_phone: string;
  lines: DeliveryLineInput[];
}) {
  const ctx = await getCurrentUser();
  if (!ctx) return { error: "Chưa đăng nhập" };
  const supabase = await createClient();

  const { count } = await supabase
    .from("delivery_notes").select("*", { count: "exact", head: true });
  const delivery_code = `DN${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: note, error } = await supabase.from("delivery_notes").insert({
    delivery_code,
    order_id: input.order_id,
    delivery_date: input.delivery_date || null,
    customer_info: input.customer_info || null,
    responsible_person: input.responsible_person || null,
    responsible_phone: input.responsible_phone || null,
    receiver_name: input.receiver_name || null,
    receiver_phone: input.receiver_phone || null,
    status: "delivered",
    created_by: ctx.user.id,
  }).select("id, delivery_code").single();
  if (error) return { error: error.message };

  const items = input.lines.filter((l) => l.delivered_qty > 0);
  if (items.length) {
    const { error: e2 } = await supabase.from("delivery_items").insert(
      items.map((l, i) => ({
        delivery_note_id: note!.id,
        order_item_id: l.order_item_id,
        seq: i + 1,
        product_name: l.product_name,
        unit: l.unit || null,
        delivered_qty: l.delivered_qty,
      })),
    );
    if (e2) return { error: e2.message };
  }

  revalidatePath("/delivery-notes");
  redirect(`/delivery-notes/${note!.id}`);
}
```

### 5b. Danh sách — `app/(app)/delivery-notes/page.tsx`
Server fetch `delivery_notes` (join `purchase_orders` để lấy mã ĐH), render bảng: mã phiếu · mã ĐH · ngày giao · SL dòng. Có nút "Tạo phiếu" → `/delivery-notes/new`.

### 5c. Tạo phiếu — `app/(app)/delivery-notes/new/page.tsx`
- Đọc `searchParams` (async) lấy `orderId`.
- Fetch ĐH + `order_items` + delivered_total từng dòng (gọi RPC `delivered_total(order_item_id)` hoặc fetch `delivery_items` rồi sum như trang detail).
- Truyền sang client component: danh sách dòng kèm `remaining = quantity − đã giao`.
- Client form: mỗi dòng 1 ô nhập `delivered_qty` (default = remaining). **Chặn nhập > remaining** (toast lỗi). Gọi `createDeliveryNote`.

### 5d. In Form 2 — copy từ Form 1 rồi đổi
- `app/print/dn/[id]/page.tsx` — server fetch `delivery_notes` + `delivery_items`.
- `components/print/print-delivery-note.tsx` — **KHÔNG cột giá**. Bảng chỉ: `序TT | 交貨項目 Tên hàng | 單位 DVT | 數量 SL`. Tiêu đề `交貨單 PHIẾU GIAO HÀNG`. Thay hộp "QUY ĐỊNH HÀNG HÓA" bằng **thanh ghi chú xanh 3 ngày** (`備註`: "Nếu hàng hóa có sai khác… thông báo trong vòng ba ngày."). 2 ô ký: `客戶簽名 CHỦ KÝ KHÁCH HÀNG` / `交貨人簽名 KÝ GIAO HÀNG`. Dùng lại class `.pp-*` trong `globals.css` (có thể thêm `.pp-note-bar`).

---

## Phase 6 — Bảng tính tiền (Form 3) — `app/(app)/ledger/page.tsx`
Đọc **view `ledger`** (đã có sẵn trong DB):
```ts
const supabase = await createClient();
let q = supabase.from("ledger").select("*").order("created_at", { ascending: false });
// lọc: ngày (created_at range), company (ilike), order_code
const { data } = await q;
const rows = (data as LedgerRow[]) ?? [];
const sumGross = rows.reduce((s, r) => s + Number(r.line_gross), 0);   // "SUM"
const canChi   = rows.reduce((s, r) => s + Number(r.net_before_vat), 0); // "SỐ TIỀN CẦN CHI"
```
Bảng cột đúng Form 3: Ngày tạo · Ngày giao · Công ty · Đơn hàng · Tên SP · DVT · SL · Đơn giá · Thành tiền · Chiết khấu% · Tiền CK · Còn lại · Ghi chú. Tổng SUM + CẦN CHI để trên đầu.
Export CSV: nút gọi hàm tạo CSV từ `rows` rồi `Blob` + `a.download` (client). Hoặc server route trả `text/csv`.

---

## Phase 7 — Dashboard + Admin

### Dashboard thật — sửa `app/(app)/page.tsx` thành server component query:
- `count` ĐH tháng này.
- `SUM(grand_total)` chưa đóng — dùng `supabase.from("purchase_orders").select("grand_total")` rồi sum JS (hoặc RPC).
- Thanh toán đến hạn: `payment_schedules` where status='unpaid' + planned_date sắp tới.
- Giao hàng chờ: ĐH có dòng `remaining > 0`.

### Admin users — `app/(app)/admin/users/page.tsx`
**Cần `SUPABASE_SERVICE_ROLE_KEY`** (paste vào `.env.local` từ Dashboard → Settings → API). Dùng `createAdminClient()` (đã có trong `lib/supabase/server.ts`):
```ts
const admin = await createAdminClient();
const { data } = await admin.auth.admin.listUsers();
// đổi role: update public.profiles set role ... where id=...
// đặt mật khẩu: admin.auth.admin.updateUserById(id, { password })
```
Guard: `requireAdmin()` (đã có trong `lib/auth.ts`). Nếu chưa có service key → tạm quản lý user qua Supabase Dashboard.

---

## Khi báo "xong từng phần"
Chạy `npx tsc --noEmit` (EXIT 0) rồi test trên browser; báo lại kết quả + lỗi (nếu có) để mình fix.
