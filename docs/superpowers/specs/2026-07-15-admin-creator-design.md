# P0.3 — Reusable Admin-Creator (Design Spec)

- **Date:** 2026-07-15
- **Status:** Approved (brainstorm) → ready for implementation plan
- **Project:** yaoyun-thumua (Next.js 16 + Supabase + Vercel; Supabase ref `ltrhpsfaoeqksqahqvog`)

## Background

- **P1.3 locked signup.** `handle_new_user()` now hard-codes `role='staff'` for every new auth user (`supabase/migrations/0002_lock_signup_role.sql`). New signups can no longer self-escalate to admin. The migration comment states: *"Admin accounts must be created via service-role path (P0.3)."*
- The old one-off bootstrap script was deleted because it **hardcoded a password** and `scripts/` was not gitignored.
- Two gaps remain today:
  1. **Cold-start / lockout recovery** — if the DB is fresh or the sole admin is locked out, there is no way to create the first admin without a service-role script.
  2. **Runtime** — the admin UI's "Tạo người dùng" dialog lets you pick "Admin", but `createUser()` passes `role` in `user_metadata`, which the locked trigger discards; every new user lands as `staff`. The role dropdown is silently ignored.

## Goal

A reusable, secure admin-creator that closes both gaps, taking credentials only from env/args (never hardcoded).

## Non-goals (YAGNI)

2FA/TOTP, email-invite flow, audit log, batch creation, changing the password policy for non-admin users.

## Relevant schema (source of truth: `supabase/migrations/0001_init.sql`)

- `public.profiles`: `id uuid PK → auth.users(id) on delete cascade`, `full_name text`, `role text not null default 'staff' check (role in ('admin','staff'))`, `created_at timestamptz default now()`. **No `email` column.**
- RLS `profiles_update`: `using (id = auth.uid() or is_admin())` with `check (is_admin() or role = <self's current role>)` → an admin **can** promote another user to admin through the normal (anon/SSR) client. So `updateUserRole()` already works and is untouched.
- `profiles_insert`: `check (is_admin())`; `handle_new_user` is `security definer`, so it bypasses RLS to insert the profile on signup.
- The service-role client (`createAdminClient()`) bypasses RLS entirely.

## Part 1 — CLI bootstrap script

New file: `scripts/create-admin.ts` (committed; **no secrets inside**).

- **Runtime:** `tsx` (added as devDep). npm script: `"create-admin": "tsx scripts/create-admin.ts"`.

### Inputs
- From env (`.env.local`, loaded via Node `process.loadEnvFile()` with try/catch so CI-injected env also works): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optional `ADMIN_FULL_NAME`.
- CLI args override env: `--email`, `--password`, `--name`.

### Validation
- URL, service key, email, password all present → else print usage and `exit(1)`.
- Password ≥ 8 characters (stricter than the UI's 6, because this grants admin) → else `exit(1)`.
- The password is never printed or logged.

### Client
`createClient(URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })`.

### Behavior — create-or-promote (idempotent)
1. `admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
2. Success → `userId = data.user.id`; log "Created new auth user".
3. Error → locate an existing user with that email by paging `admin.auth.admin.listUsers({ page, perPage: 1000 })` until found:
   - Found → `admin.auth.admin.updateUserById(id, { password, email_confirm: true })`; log "Existing user — password reset".
   - Not found → surface the original `createUser` error and `exit(1)`.
4. Always → `admin.from('profiles').upsert({ id: userId, role: 'admin', ...(full_name ? { full_name } : {}) }, { onConflict: 'id' })`. This overrides the trigger-set `'staff'` (service role bypasses RLS). Log "role set to admin".
5. `exit(0)`. Any unexpected error → stderr + `exit(1)`.

### Security
No secrets in the file → safe to commit. `.env.local` is already gitignored (`.env*`). `scripts/` stays tracked. The service role is used only here and in `createAdminClient()`.

## Part 2 — Runtime fix

File: `lib/actions/admin.ts`, function `createUser`.

Capture `data` from `admin.auth.admin.createUser(...)`; after success, if `role === 'admin'` and `data.user?.id` exists:

```ts
await admin.from("profiles").upsert(
  { id: data.user.id, role: "admin" },
  { onConflict: "id" },
);
```

The service role bypasses RLS and overrides the `'staff'` set by the trigger. The "Admin" option in `CreateUserDialog` now creates an admin as intended. `updateUserRole()` (the promote button) already works via RLS — unchanged.

## Verification

- **Script:** `npm run create-admin` against the live project with a throwaway email → confirm `profiles.role = 'admin'` and the user can log in → then delete the test user. Re-run against an existing staff email to confirm the promote/reset path.
- **Runtime:** `npx tsc --noEmit` (exit 0, per project guide); then in the browser as admin, create a user with role Admin and confirm `profiles.role = 'admin'`.
- **Deploy:** redeploy to Vercel (`vercel --prod`) so the live UI picks up the runtime fix. Env vars are already configured.

## Out of scope / future

- Disabling email signup in the Supabase Dashboard (defense-in-depth) — tracked separately in security notes.
- Rotating the shared test admin password `Yaoyun@2026` — operational item, flagged separately.
