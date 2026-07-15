-- 0003_indexes.sql — indexes for list/dashboard/detail queries
create index if not exists po_created_at_idx     on public.purchase_orders (created_at desc);
create index if not exists po_status_idx          on public.purchase_orders (status);
create index if not exists po_created_by_idx      on public.purchase_orders (created_by);
create index if not exists po_supplier_idx        on public.purchase_orders (supplier_id);
create index if not exists po_customer_idx        on public.purchase_orders (customer_id);
create index if not exists dn_order_idx           on public.delivery_notes (order_id);
create index if not exists dn_created_at_idx      on public.delivery_notes (created_at desc);
create index if not exists dn_status_idx          on public.delivery_notes (status);
create index if not exists pay_status_date_idx    on public.payment_schedules (status, planned_date);
create index if not exists suppliers_created_by_idx on public.suppliers (created_by);
create index if not exists customers_created_by_idx on public.customers (created_by);
