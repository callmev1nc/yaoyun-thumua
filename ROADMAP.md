# Kế hoạch hoàn thiện — Yaoyun Thu Mua

Trạng thái: **đang xây dựng** · Stack: Next.js 16 + Supabase + Vercel
Project Supabase: `yaoyun-thumua` (ap-southeast-1) · Tài khoản test: `admin@yaoyun.vn / <rotated-strong-password>`

---

## ✅ Đã làm & ĐÃ VERIFY (chạy thật)

| Phase | Nội dung | Verify |
|---|---|---|
| **1** | Scaffold Next 16 + Tailwind v4 + 12 shadcn components · Supabase browser/server/admin clients · `proxy.ts` (Next 16) · login + callback + logout · role guards · app shell (sidebar) · dashboard | ✅ Đăng nhập thật trên browser, vào dashboard, role "Admin" đúng |
| **2** | Schema `0001_init.sql`: 8 bảng + view `ledger` + hàm tiền (mirror `calc.ts`) + GENERATED dòng + **trigger** tính lại tổng ĐH & tiền từng đợt + RLS (Admin/NV) | ✅ Migration apply OK; trigger tạo profile admin tự động; login trả token |
| **3** | Suppliers/Customers CRUD · PO create form (editor dòng + 4 đợt thanh toán + tính tổng realtime) · PO list (search) | ✅ Tạo NCC OK; form tính đúng: line1 `8.120.000×8%=649.600→8.769.600`; tổng `10.859.600`; 4 đợt đúng % |
| **4 (đang dở)** | PO detail (đã giao/còn lại, thanh toán) + `PrintPurchaseOrder` A4 song ngữ + logo thật | 🟡 Detail + print đã code; **chưa verify save→redirect** (vướng bug bên dưới) |

## 🔴 Bug đang chặn (1 dòng)

`lib/actions/orders.ts` cuối file có `export type { LineInput };` → khi compile thành server-action module báo **"LineInput is not defined"** → bấm "Lưu đơn" lỗi.
**Fix:** xoá dòng `export type { LineInput };` (đã xoá import rồi, còn dòng export). Xong là flow "tạo ĐH → xem chi tiết" chạy được.

## ⏭️ Việc còn lại (theo thứ tự)

### Phase 4 — hoàn thiện & verify (sau khi fix bug)
1. Bấm "Lưu đơn" → kiểm tra trang detail hiện đúng: dòng SP, **đã giao/còn lại**, bảng 4 đợt, tổng `10.859.600`.
2. Kiểm `ledger` (SQL) có 2 dòng + SUM đúng.
3. Mở `/print/po/[id]` → **so-overlay với `Form 1.pdf`**: logo, nhãn song ngữ, 7 cột, tổng, hộp xanh, 2 ô ký.
4. Sửa cột "Chưa VAT" ở form tạo thành `netBeforeVat` (sau CK) cho khớp print.

### Phase 5 — Phiếu giao hàng (Form 2)
- `app/(app)/delivery-notes/page.tsx` — list phiếu (lọc theo ĐH/ngày).
- `app/(app)/delivery-notes/new/page.tsx?orderId=X` — tạo từ ĐH: auto-fill khách/người nhận/dòng SP, nhập `delivered_qty`/dòng (mặc định = còn lại); chặn giao vượt SL.
- `lib/actions/delivery.ts` — createDeliveryNote (header + items).
- `components/print/print-delivery-note.tsx` + `app/print/dn/[id]/page.tsx` — **in A4 song ngữ, KHÔNG cột giá**: `序TT | 交貨項目 Tên hàng | 單位 DVT | 數量 SL` + thanh ghi chú 3 ngày + 2 ô ký (Khách hàng / Ký giao hàng).
- Verify: giao 2 lần (4 rồi 6) → "còn lại" về 0; giao lần 3 vượt SL → báo chênh lệch.

### Phase 6 — Bảng tính tiền (Form 3)
- `app/(app)/ledger/page.tsx` — đọc view `ledger`: bảng tất cả dòng (Ngày tạo, Ngày giao, Công ty, Đơn hàng, Tên SP, DVT, SL, Đơn giá, Thành tiền, CK%, Tiền CK, Còn lại, Ghi chú).
- Bộ lọc (khoảng ngày / công ty / đơn hàng) + tổng **SUM** và **SỐ TIỀN CẦN CHI**.
- Nút **export CSV/Excel**.

### Phase 7 — Dashboard + Admin + polish
- Dashboard: thẻ số ĐH tháng, tổng cần chi (từ `ledger`), thanh toán đến hạn, giao hàng chờ — số liệu thật.
- `app/(app)/admin/users/page.tsx` (admin-only): list user + đổi role + đổi mật khẩu (gọi Supabase admin).
- Polish UX: mobile sidebar, empty states, confirm xoá, format tiền nhất quán.
- End-to-end test đầy đủ (theo checklist dưới).

## ✅ Checklist kiểm thử cuối
1. Đăng nhập admin & nhân viên; nhân viên không vào `/admin/users`; admin quản được user.
2. Tạo ĐH đầy đủ (VAT 8/10 trộn + CK%) → tổng đúng; 4 đợt = 100%.
3. Tạo 2 phiếu giao (giao từng phần) → còn lại = 0; giao thừa → báo lỗi.
4. **In Form 1 & Form 2 → so-overlay PDF gốc** (logo, song ngữ, cột, ô ký). Form 2 không giá.
5. Ledger: đúng mọi dòng, lọc OK, SUM & CẦN CHI khớp, export CSV mở đúng.
6. Đối chiếu mẫu gốc `YY202603005`: `8.120.000 × 8% = 649.600 → 8.769.600`.

## 🚀 Deploy (sau khi xong)
1. Push code lên GitHub → import vào Vercel.
2. Set env trên Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. (Supabase Auth) tắt "Confirm email" nếu muốn, hoặc giữ; thêm user thật qua dashboard.
4. Đổi mật khẩu admin sang mật khẩu mạnh (không hardcode trong code/docs).

## ⚠️ Quyết định kỹ thuật đã chốt (có thể chỉnh)
- **Chiết khấu giảm base chịu thuế**: VAT tính trên `(giá − CK)`.
- **Form 3 "SỐ TIỀN CẦN CHI" = Σ(Còn lại)** = pre-VAT (khớp file gốc). Nếu kế toán muốn gồm VAT thì đảo.
- **"Công ty" trong ledger = Nhà cung cấp** (người nhận tiền).
