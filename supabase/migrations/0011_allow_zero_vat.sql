-- Allow 0% VAT (export / non-taxable items) alongside 8% and 10%.
-- Widens the three CHECK constraints that previously restricted rates to (8,10).
-- Money math already divides by 100, so rate 0 simply yields VAT 0.
-- See docs/DATABASE.md; apply via Supabase MCP or Dashboard SQL Editor
-- (the build does not run migrations against the live DB).

alter table public.order_items
  drop constraint if exists order_items_vat_rate_check,
  add constraint order_items_vat_rate_check check (vat_rate in (0, 8, 10));

alter table public.products
  drop constraint if exists products_default_vat_rate_check,
  add constraint products_default_vat_rate_check check (default_vat_rate in (0, 8, 10));

alter table public.profiles
  drop constraint if exists profiles_default_vat_rate_check,
  add constraint profiles_default_vat_rate_check check (default_vat_rate in (0, 8, 10));
