-- 0005_toiuu_fixes.sql — remove discount, tax-inclusive ledger, payment due/remaining, PGH code
-- Order matters: the ledger VIEW depends on the columns we drop, and CREATE OR REPLACE
-- FUNCTION cannot change a function's argument signature — so drop the view + old funcs first.

-- 1. Drop the dependent view FIRST
drop view if exists public.ledger;

-- 2. Drop generated columns that reference the calc functions
alter table public.order_items
  drop column if exists discount_amount,
  drop column if exists net_before_vat,
  drop column if exists line_vat,
  drop column if exists line_total;

-- 3. Replace calc functions (signatures change: 3-arg -> 2-arg, so DROP then CREATE)
drop function if exists public.yy_disc_amt(numeric, numeric, numeric);
drop function if exists public.yy_net(numeric, numeric, numeric);
drop function if exists public.yy_vat(numeric, numeric, numeric, numeric);
drop function if exists public.yy_line_total(numeric, numeric, numeric, numeric);

create function public.yy_net(qty numeric, price numeric)
returns numeric language sql immutable as $$
  select public.yy_gross(qty, price);
$$;
create function public.yy_vat(qty numeric, price numeric, rate numeric)
returns numeric language sql immutable as $$
  select round(public.yy_net(qty, price) * coalesce(rate, 0) / 100);
$$;
create function public.yy_line_total(qty numeric, price numeric, rate numeric)
returns numeric language sql immutable as $$
  select public.yy_net(qty, price) + public.yy_vat(qty, price, rate);
$$;

-- 4. Recreate generated columns (line_total now tax-inclusive)
alter table public.order_items
  add column net_before_vat numeric generated always as (public.yy_net(quantity, unit_price)) stored,
  add column line_vat       numeric generated always as (public.yy_vat(quantity, unit_price, vat_rate)) stored,
  add column line_total     numeric generated always as (public.yy_line_total(quantity, unit_price, vat_rate)) stored;

-- 5. Drop the source discount column
alter table public.order_items drop column if exists discount_percent;

-- 6. Recreate the ledger view (tax-inclusive + payment due date + order remaining)
create view public.ledger as
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
  oi.line_total,
  oi.net_before_vat,
  po.note,
  po.project_code,
  po.po_code,
  po.customer_company,
  (select min(ps.planned_date) from public.payment_schedules ps
     where ps.order_id = po.id and ps.status = 'unpaid') as payment_due_date,
  (po.grand_total - coalesce((
     select sum(ps.amount) from public.payment_schedules ps
     where ps.order_id = po.id and ps.status = 'paid'), 0)) as order_remaining
from public.purchase_orders po
join public.order_items oi on oi.order_id = po.id;
grant select on public.ledger to authenticated;

-- 7. PGH manual code + customer link on delivery notes
alter table public.delivery_notes
  add column if not exists pgh_code text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null;
