-- =============================================================
-- Yaoyun Thu Mua — initial schema
-- Mirrors lib/calc.ts exactly. DB is the single source of truth:
--   - order_items line calcs are GENERATED (same-row base columns)
--   - purchase_orders totals + payment amounts are maintained by a
--     trigger that re-aggregates order_items after any change.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Immutable money helpers (MUST match lib/calc.ts)
-- discount reduces the VAT-able base.
-- -------------------------------------------------------------
create or replace function public.yy_gross(qty numeric, price numeric)
returns numeric language sql immutable as $$
  select round(coalesce(qty, 0) * coalesce(price, 0));
$$;

create or replace function public.yy_disc_amt(qty numeric, price numeric, disc numeric)
returns numeric language sql immutable as $$
  select round(public.yy_gross(qty, price) * coalesce(disc, 0) / 100);
$$;

create or replace function public.yy_net(qty numeric, price numeric, disc numeric)
returns numeric language sql immutable as $$
  select public.yy_gross(qty, price) - public.yy_disc_amt(qty, price, disc);
$$;

create or replace function public.yy_vat(qty numeric, price numeric, disc numeric, rate numeric)
returns numeric language sql immutable as $$
  select round(public.yy_net(qty, price, disc) * coalesce(rate, 0) / 100);
$$;

create or replace function public.yy_line_total(qty numeric, price numeric, disc numeric, rate numeric)
returns numeric language sql immutable as $$
  select public.yy_net(qty, price, disc) + public.yy_vat(qty, price, disc, rate);
$$;

-- -------------------------------------------------------------
-- profiles (extends auth.users)
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------
-- suppliers / customers (reusable directories)
-- -------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  address text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- -------------------------------------------------------------
-- purchase_orders (Form 1 header). Totals maintained by trigger.
-- -------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  supplier_id uuid references public.suppliers(id),
  supplier_company text,
  supplier_contact text,
  supplier_phone text,
  buyer_name text,
  buyer_phone text,
  receiver_name text,
  receiver_phone text,
  receiver_address text,
  customer_id uuid references public.customers(id),
  delivery_date date,
  status text not null default 'draft' check (status in ('draft','confirmed','closed')),
  note text,
  subtotal_ex_vat numeric not null default 0,
  vat_total numeric not null default 0,
  grand_total numeric not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- -------------------------------------------------------------
-- order_items (Form 1 lines). Line calcs are GENERATED.
-- -------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  seq integer not null default 1,
  product_name text not null default '',
  unit text,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  vat_rate numeric not null default 8 check (vat_rate in (8,10)),
  discount_percent numeric not null default 0 check (discount_percent between 0 and 100),
  line_gross numeric generated always as (public.yy_gross(quantity, unit_price)) stored,
  discount_amount numeric generated always as (public.yy_disc_amt(quantity, unit_price, discount_percent)) stored,
  net_before_vat numeric generated always as (public.yy_net(quantity, unit_price, discount_percent)) stored,
  line_vat numeric generated always as (public.yy_vat(quantity, unit_price, discount_percent, vat_rate)) stored,
  line_total numeric generated always as (public.yy_line_total(quantity, unit_price, discount_percent, vat_rate)) stored
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- -------------------------------------------------------------
-- payment_schedules (4 installments). amount maintained by trigger.
-- -------------------------------------------------------------
create table if not exists public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  installment_no integer not null default 1,
  percent numeric not null default 0 check (percent between 0 and 100),
  planned_date date,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  paid_date date,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (order_id, installment_no)
);

create index if not exists payment_schedules_order_id_idx on public.payment_schedules(order_id);

-- -------------------------------------------------------------
-- Re-aggregate an order's totals + payment amounts after item changes.
-- -------------------------------------------------------------
create or replace function public.recompute_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  oid uuid := coalesce(new.order_id, old.order_id);
  gt numeric;
begin
  if oid is null then
    return null;
  end if;

  update public.purchase_orders p
  set
    subtotal_ex_vat = coalesce(s.net, 0),
    vat_total = coalesce(s.vat, 0),
    grand_total = coalesce(s.tot, 0)
  from (
    select
      sum(net_before_vat) as net,
      sum(line_vat) as vat,
      sum(line_total) as tot
    from public.order_items
    where order_id = oid
  ) s
  where p.id = oid;

  select grand_total into gt from public.purchase_orders where id = oid;

  update public.payment_schedules
  set amount = round(coalesce(gt, 0) * percent / 100)
  where order_id = oid;

  return null;
end;
$$;

drop trigger if exists trg_order_items_recompute on public.order_items;
create trigger trg_order_items_recompute
  after insert or update or delete on public.order_items
  for each row execute function public.recompute_order();

-- -------------------------------------------------------------
-- delivery_notes (Form 2 header) + delivery_items (no prices)
-- -------------------------------------------------------------
create table if not exists public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  delivery_code text not null unique,
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  delivery_date date,
  customer_info text,
  responsible_person text,
  responsible_phone text,
  receiver_name text,
  receiver_phone text,
  status text not null default 'delivered' check (status in ('draft','delivered','cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references public.delivery_notes(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  seq integer not null default 1,
  product_name text not null default '',
  unit text,
  delivered_qty numeric not null default 0
);

create index if not exists delivery_items_note_idx on public.delivery_items(delivery_note_id);
create index if not exists delivery_items_order_item_idx on public.delivery_items(order_item_id);

-- Per-line quantity delivered across all delivery notes of an order.
create or replace function public.delivered_total(p_order_item_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(delivered_qty), 0)
  from public.delivery_items di
  join public.delivery_notes dn on dn.id = di.delivery_note_id
  where di.order_item_id = p_order_item_id
    and dn.status <> 'cancelled';
$$;

-- -------------------------------------------------------------
-- ledger view (Form 3 — "all the story"). One row per order_item.
-- -------------------------------------------------------------
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
  oi.line_gross,          -- "Thành tiền"
  oi.discount_percent,    -- "Chiết khấu"
  oi.discount_amount,     -- "Số tiền chiết khấu"
  oi.net_before_vat,      -- "Còn lại"
  po.note
from public.purchase_orders po
join public.order_items oi on oi.order_id = po.id;

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_schedules enable row level security;
alter table public.delivery_notes enable row level security;
alter table public.delivery_items enable row level security;

-- profiles: everyone reads; self or admin writes; no self role-escalation.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (public.is_admin() or role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete to authenticated using (public.is_admin());

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (public.is_admin());

-- All procurement tables: any authenticated user can read/write (Admin + NV).
create policy "suppliers_all" on public.suppliers for all to authenticated using (true) with check (true);
create policy "customers_all" on public.customers for all to authenticated using (true) with check (true);
create policy "purchase_orders_all" on public.purchase_orders for all to authenticated using (true) with check (true);
create policy "order_items_all" on public.order_items for all to authenticated using (true) with check (true);
create policy "payment_schedules_all" on public.payment_schedules for all to authenticated using (true) with check (true);
create policy "delivery_notes_all" on public.delivery_notes for all to authenticated using (true) with check (true);
create policy "delivery_items_all" on public.delivery_items for all to authenticated using (true) with check (true);

-- Grant view access.
grant select on public.ledger to authenticated;
grant execute on function public.delivered_total(uuid) to authenticated;
