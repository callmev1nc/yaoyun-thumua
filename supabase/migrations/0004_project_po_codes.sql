-- =============================================================
-- 0004: mã dự án (project_code, nhập tay) + mã đơn đặt (po_code, tự sinh)
--       + customer_company snapshot (để hiển thị cột Khách hàng).
-- =============================================================
alter table public.purchase_orders
  add column if not exists project_code text,
  add column if not exists po_code text,
  add column if not exists customer_company text;

-- po_code duy nhất khi có giá trị (cho phép nhiều NULL).
create unique index if not exists purchase_orders_po_code_key
  on public.purchase_orders (po_code) where po_code is not null;

-- Mở rộng view ledger: CHỈ ĐƯỢC NỐI CỘT Ở CUỐI (giới hạn CREATE OR REPLACE VIEW).
create or replace view public.ledger as
select
  po.id as order_id,
  po.order_code,
  po.created_at,
  po.delivery_date,
  po.supplier_company as company,
  oi.product_name,
  oi.unit,
  oi.quantity,
  oi.unit_price,
  oi.line_gross,
  oi.discount_percent,
  oi.discount_amount,
  oi.net_before_vat,
  po.note,
  po.project_code,
  po.po_code,
  po.customer_company
from public.purchase_orders po
join public.order_items oi on oi.order_id = po.id;

grant select on public.ledger to authenticated;
