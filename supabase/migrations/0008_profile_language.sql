-- Add per-user language preference
alter table public.profiles
  add column if not exists preferred_language text
  check (preferred_language in ('vi', 'zh-Hant', 'zh-Hans'));

-- Preserve current experience for existing Vietnamese staff (no surprise switch).
update public.profiles set preferred_language = 'vi' where preferred_language is null;

-- Update auto-create function for new users (default to Traditional Chinese)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, preferred_language)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'staff'),
    'zh-Hant'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
