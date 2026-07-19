-- Smart-defaults ("remember last used") for the PO form. All nullable.
alter table public.profiles
  add column if not exists last_supplier_id        uuid    references public.suppliers(id)  on delete set null,
  add column if not exists last_customer_id        uuid    references public.customers(id) on delete set null,
  add column if not exists last_buyer_name         text,
  add column if not exists last_buyer_phone        text,
  add column if not exists default_vat_rate        numeric(4,2) check (default_vat_rate in (8, 10)),
  add column if not exists default_payment_schedule jsonb;
