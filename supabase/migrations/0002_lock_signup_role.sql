-- Lock signup role: prevent self-escalation to admin.
-- The trigger now hard-codes 'staff' so that no signup can
-- inject raw_user_meta_data ->> 'role' = 'admin'.
-- Admin accounts must be created via service-role path (P0.3).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
