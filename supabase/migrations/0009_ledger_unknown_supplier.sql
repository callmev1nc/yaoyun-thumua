-- Replace Vietnamese fallback in the spend-by-supplier view;
-- translate client-side instead.
create or replace view public.v_spend_by_supplier as
select
  supplier_company,
  count(*)::bigint            as order_count,
  coalesce(sum(grand_total), 0) as total_spend
from public.purchase_orders
group by supplier_company;
grant select on public.v_spend_by_supplier to authenticated;
