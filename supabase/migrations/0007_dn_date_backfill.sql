-- 0007_dn_date_backfill.sql
-- Fill in delivery notes that were saved without a delivery date so their
-- printed Phiếu giao hàng no longer shows a blank "Ngày giao".
update public.delivery_notes
  set delivery_date = (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  where delivery_date is null;
