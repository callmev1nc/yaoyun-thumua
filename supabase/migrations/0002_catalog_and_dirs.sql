-- Product catalog + buyer directory + customer contact columns + dashboard view.
-- Same permissive RLS as 0001 (trusted internal app).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  default_unit text,
  default_price numeric not null default 0,
  default_vat_rate numeric not null default 8 check (default_vat_rate in (8,10)),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists products_name_idx on public.products (name);

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.customers add column if not exists contact_name text;
alter table public.customers add column if not exists phone text;

alter table public.products enable row level security;
alter table public.buyers   enable row level security;
drop policy if exists "products_all" on public.products;
create policy "products_all" on public.products for all to authenticated using (true) with check (true);
drop policy if exists "buyers_all" on public.buyers;
create policy "buyers_all" on public.buyers for all to authenticated using (true) with check (true);

create or replace view public.v_spend_by_supplier as
select
  coalesce(supplier_company, '(chưa rõ NCC)') as supplier_company,
  count(*)::bigint                              as order_count,
  coalesce(sum(grand_total), 0)                 as total_spend
from public.purchase_orders
group by coalesce(supplier_company, '(chưa rõ NCC)');
grant select on public.v_spend_by_supplier to authenticated;
