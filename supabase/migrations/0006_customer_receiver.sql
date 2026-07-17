-- 0006_customer_receiver.sql
-- Add per-customer delivery recipient (Người nhận / SĐT) so it is saved once
-- and auto-filled into the Purchase Order when the customer is picked.

alter table public.customers
  add column if not exists receiver_name text,
  add column if not exists receiver_phone text;

-- Backfill: the old PO form stored recipient data into contact_name/phone.
-- Copy those into the new dedicated recipient columns so no data is lost.
update public.customers
  set receiver_name = contact_name
  where receiver_name is null and contact_name is not null;

update public.customers
  set receiver_phone = phone
  where receiver_phone is null and phone is not null;
