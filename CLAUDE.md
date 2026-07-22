@AGENTS.md

# Yaoyun Thu Mua — Procurement Tracker

Bilingual (vi/zh) purchase-order management app that mirrors 3 paper forms: Purchase Order (Form 1 / Đơn đặt hàng), Delivery Note (Form 2 / Phiếu giao hàng), and Ledger (Form 3 / Sổ cái). Built for a Vietnamese import/procurement team that works across Vietnamese and Chinese (Traditional & Simplified). Deployed at https://yaoyun.vercel.app.

**Stack:** Next.js 16.2.10 · React 19.2.4 · TypeScript 5 · Tailwind v4 · shadcn/ui (Radix-Nova) · Supabase SSR (`createBrowserClient` / `createServerClient`) + service-role `createAdminClient` · next-intl (vi, zh-Hant-default, zh-Hans) · zod v4 · `@supabase/ssr` · Vercel (sin1)

## Folder Map

| Path | Responsibility |
|------|---------------|
| `app/(app)/` | Authenticated routes — PO/DN/Ledger/Directories/Admin/Settings/Dashboard |
| `app/(app)/purchase-orders/` | PO list, create (`/new`), detail (`/[id]`), edit (`/[id]/edit`) |
| `app/(app)/delivery-notes/` | DN list, create, detail, edit |
| `app/(app)/ledger/` | Ledger view with filters |
| `app/(app)/suppliers/` | Supplier directory CRUD |
| `app/(app)/customers/` | Customer directory CRUD |
| `app/(app)/admin/users/` | Admin user management (requires admin role) |
| `app/(app)/settings/` | Profile, language, theme |
| `app/(auth)/login/` | Login form (email/password) |
| `app/print/po/[id]/` | A4 bilingual print for Purchase Order |
| `app/print/dn/[id]/` | A4 bilingual print for Delivery Note |
| `app/api/ledger/csv/route.ts` | CSV export (UTF-8 BOM, formula-injection guard) |
| `app/auth/callback/route.ts` | PKCE auth callback handler |
| `app/globals.css` | Tailwind v4 base + shadcn theme (OKLCH) + `.pp-*` print styles |
| `app/layout.tsx` | Root layout: fonts, ThemeProvider, Toaster, i18n |
| `app/actions.ts` | Shared server action: `signOut` |
| `proxy.ts` | Next.js 16 middleware — `updateSession` (refresh + auth guard) |
| `components/` | Client components — forms, print layouts, sidebar, directory managers |
| `components/ui/` | 14 shadcn/ui primitives (badge, button, card, dialog, dropdown-menu, input, label, progress, select, separator, sonner, table, tabs, textarea) |
| `components/forms/purchase-order-form.tsx` | Complex PO form with realtime calc via `lib/calc.ts` |
| `components/forms/delivery-note-form.tsx` | DN form with remaining-qty validation |
| `components/print/print-purchase-order.tsx` | A4 print layout for PO |
| `components/print/print-delivery-note.tsx` | A4 print layout for DN |
| `components/sidebar.tsx` | App sidebar with nav, user info, lang/theme toggle |
| `components/suppliers-manager.tsx` | Supplier CRUD client component |
| `components/customers-manager.tsx` | Customer CRUD client component |
| `components/settings-form.tsx` | Profile/language/theme settings |
| `components/language-switcher.tsx` | zh-Hant / zh-Hans / vi switcher |
| `components/theme-provider.tsx` | Wrapper around `next-themes` |
| `components/theme-toggle.tsx` | Dark/light/system toggle |
| `components/po-status-badge.tsx` | Status badge (draft/confirmed/closed) |
| `components/nav-link.tsx` | Sidebar navigation link |
| `components/empty-state.tsx` | Reusable empty state |
| `components/delete-delivery-button.tsx` | Delete DN with confirmation |
| `components/delete-order-button.tsx` | Delete PO with confirmation |
| `components/duplicate-order-button.tsx` | Duplicate PO |
| `lib/actions/orders.ts` | `createOrder`, `updateOrder` (428 lines — most complex) |
| `lib/actions/delivery.ts` | `createDelivery`, `updateDelivery` (234 lines) |
| `lib/actions/suppliers.ts` | Supplier CRUD server actions |
| `lib/actions/customers.ts` | Customer CRUD (with soft-dedup by `company_name`) |
| `lib/actions/products.ts` | Product CRUD (with soft-dedup by `name`) |
| `lib/actions/buyers.ts` | Buyer CRUD |
| `lib/actions/admin.ts` | `listUsers`, `createUser`, `updateUserRole`, `resetUserPassword` (122 lines) |
| `lib/actions/profile.ts` | `updateProfile` (full_name) |
| `lib/actions/locale.ts` | `setLocale` (cookie + profile update) |
| `lib/supabase/client.ts` | Browser-side client (`createBrowserClient`, anon key) |
| `lib/supabase/server.ts` | SSR per-request client + `createAdminClient` (service_role, bypasses RLS) |
| `lib/supabase/middleware.ts` | `updateSession` — session refresh + auth guard for `proxy.ts` |
| `lib/calc.ts` | Money-math mirroring SQL GENERATED columns (90 lines) |
| `lib/validation.ts` | Zod schemas for all entities (173 lines) |
| `lib/auth.ts` | `getCurrentUser`, `requireUser`, `requireAdmin` (47 lines) |
| `lib/number-format.ts` | Locale-aware `formatVND`, `formatDate`, `parseLooseNumber` (49 lines) |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `supabase/migrations/` | 11 SQL migrations (0001–0010) |
| `types/db.ts` | Hand-written TS interfaces mirroring DB schema (176 lines) |
| `messages/vi.json` | Vietnamese translations |
| `messages/zh-Hant.json` | Traditional Chinese translations (default locale) |
| `messages/zh-Hans.json` | Simplified Chinese translations |
| `i18n/request.ts` | next-intl config — reads `locale` cookie, defaults to `zh-Hant` |
| `scripts/create-admin.ts` | CLI admin creator (service-role, P0.3) |
| `scripts/render_logo.py` | Logo rendering utility (Python) |
| `next.config.ts` | CSP headers, next-intl plugin |
| `vercel.json` | Region `sin1` (Singapore) |

## Three Iron Rules

1. **DB is the single source of truth for money.** `order_items` money columns (`line_gross`, `net_before_vat`, `line_vat`, `line_total`) are Postgres GENERATED — computed from `quantity`, `unit_price`, `vat_rate` via `yy_*` functions. The `recompute_order()` trigger maintains PO totals (`subtotal_ex_vat`, `vat_total`, `grand_total`) and `payment_schedules.amount` after every item change. `lib/calc.ts` only *mirrors* these formulas so the live form preview matches — always change the SQL first, then mirror in TS. Discount was removed in migration `0005` (now `yy_net` = `yy_gross` with no subtraction).

2. **Open RLS is INTENTIONAL** — every procurement table uses `for all to authenticated using (true)`. Trusted internal team (admin + staff); there's no multi-tenant isolation requirement. The only fine-grained RLS is on `profiles` (self/admin write, admin delete/insert). Do NOT re-flag or "fix" the procurement RLS.

3. **This is Next.js 16, not the Next.js in training data** — `cookies()`, `params`, `searchParams` are all `async` (must `await`). Middleware file is `proxy.ts` (not `middleware.ts`). Server actions use `"use server"` directive. Read `node_modules/next/dist/docs/` before writing server actions, `redirect`, `revalidatePath`, or async `cookies()`/`params`/`searchParams`. Turbopack is the default bundler.

## Documentation Index

| Doc | When to read |
|-----|-------------|
| `docs/ARCHITECTURE.md` | You need the big picture: request lifecycle, 3 Supabase clients, i18n setup, bilingual print model, money-math mirroring |
| `docs/DATABASE.md` | You need table/column names, migration history (0001–0010), RLS, generated columns, SQL functions, relationships |
| `docs/FEATURES.md` | You need to understand a business feature — PO code generation, edit-in-place caveat, DN partial delivery, ledger CSV export, directory dedup, admin user management |
| `docs/DEVELOPMENT.md` | You need to run/build/ship the app, apply Supabase migrations, add i18n keys, env vars, deploy to Vercel |
| `docs/GOTCHAS.md` | Something feels wrong — check here first for known traps (captcha, migration-vs-live, edit-with-deliveries, code-prefix parsing, loading flash) and accepted decisions |
| `AGENTS.md` | Next.js 16 rules (already imported at top of this file) |
| `docs/superpowers/` | Historical design specs + archived status docs (admin-creator P0.3 spec/plan; superseded mid-build `ROADMAP.md` & `IMPLEMENTATION-GUIDE.md` snapshots) |

## Top Gotchas

- **Captcha must stay OFF** — no captcha widget, no captcha key configured. Email/password auth only.
- **Migration files ≠ applied to live DB** — the build does not touch the database. Verify via Supabase MCP `apply_migration` or Supabase Dashboard SQL Editor. All 11 migration files on disk may not all be live.
- **Editing an order that has deliveries** — edit `order_items` in place by `id`. `delivery_items.order_item_id` is FK with `ON DELETE CASCADE` — deleting an item cascades to delete its delivery records. The `updateOrder` action handles this correctly.
- **Code-prefix strip bug class** — order codes = `YY{year}{seq}` (e.g. `YY202600001`), delivery codes = `GH{year}{seq}` (e.g. `GH202600001`). `nextOrderCode()` and `nextDeliveryCode()` slice by `prefix.length` (6 for 4-digit years). Always strip by `prefix.length`, not a hardcoded number.
- **`loading.tsx` doesn't mask cookies-auth fetch** — on hard refresh, the SSR `getUser()` call runs before React hydrates. Brief flash of login page possible before session is restored.
- **All async APIs** — `cookies()`, `params`, `searchParams` require `await`. Failing to `await` will throw or return undefined. This is a Next.js 16 breaking change.
- **`@supabase/ssr` `createServerClient` requires `cookies` config** — you must provide `getAll()` and `setAll()` methods. The server client in `lib/supabase/server.ts` uses `await cookies()` (async) and `try/catch` around `setAll()` (throws in Server Components where cookies can't be modified).
- **zod v4 is a runtime dependency** — `zod` is in `dependencies` (not `devDependencies`) because `lib/validation.ts` validates server action inputs at runtime. This is intentional.
- **Snapshot denormalization** — POs copy supplier/customer/buyer/receiver data at write time. Historical records survive directory edits. If you add a field to a directory, existing POs won't have it unless you add a migration to backfill.
- **`proxy.ts` matcher excludes static files** — if an image/CSS/JS file returns HTML (login page redirect), the auth guard is blocking it. The matcher regex intentionally excludes `.*\.(png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|otf|txt|webmanifest)` so static assets load on unauthenticated pages.

## Common Task Patterns

### Add a new route
1. Create page under `app/(app)/` (authenticated) or `app/(auth)/` (login)
2. Add server component that calls `requireUser()` or `requireAdmin()`
3. Add link in `components/sidebar.tsx`
4. Add translation keys to all 3 `messages/*.json` files
5. Follow existing patterns: list page = server fetch → client table component; form page = server action + client form component

### Add a new Server Action
1. Create file in `lib/actions/` with `"use server"` at top
2. Use `getCurrentUser()` for auth check
3. Use zod schema for validation
4. Use `createClient()` from `@/lib/supabase/server` for DB access
5. Call `revalidatePath()` then `redirect()` on success

### Add a new DB column
1. Create migration file `supabase/migrations/0011_xxx.sql`
2. Apply via Supabase MCP or Dashboard SQL Editor
3. Add column to the TypeScript interface in `types/db.ts`
4. If it affects the ledger view, recreate `create or replace view public.ledger as ...`
5. If it affects forms, add the field in the relevant form component

### Add a new i18n key
1. Add key to all 3 files: `messages/{vi,zh-Hant,zh-Hans}.json` (keep parity)
2. Use `getTranslations()` from `next-intl/server` in server components/actions
3. Use `useTranslations()` from `next-intl` in client components

### Debug a money-math discrepancy
1. Check the SQL GENERATED column formula in `supabase/migrations/0001_init.sql` (or `0005_toiuu_fixes.sql` for the current version without discount)
2. Check the TS mirror in `lib/calc.ts` — both must match exactly
3. `order_items` columns are computed by DB on INSERT/UPDATE; the form preview uses `lib/calc.ts`
4. If the discrepancy is on PO totals, check `recompute_order()` trigger logic

## Key Technical Patterns

### List page pattern (used by POs, DNs, Suppliers, Customers, Ledger)
- Server component fetches data via `createClient()`
- Passes data as props to a client component (`"use client"`)
- Client component handles search, filter, sort, pagination client-side
- CRUD operations call server actions (which `revalidatePath` on success)
- Example: `app/(app)/suppliers/page.tsx` → `components/suppliers-manager.tsx`

### Create/Edit form pattern
- Form page reads the page as a server component (fetches directories, defaults)
- Client form component manages local state + validation
- On submit, calls server action which validates with zod, writes to Supabase, then `revalidatePath()` + `redirect()`
- Example: `components/forms/purchase-order-form.tsx` (most complex — ~400 lines)

### Print page pattern
- Server component fetches the PO/DN with all relations
- Renders `components/print/print-purchase-order.tsx` or `components/print/print-delivery-note.tsx`
- Fetches two locale message sets (vi + user's CN variant) for side-by-side rendering
- `.pp-*` CSS classes handle A4 page breaks and print layout

## Supabase Client Usage

### Which client to use

| Context | Client | Import |
|---------|--------|--------|
| Server Component (page) | `createClient()` (anon) | `@/lib/supabase/server` |
| Server Action | `createClient()` (anon) | `@/lib/supabase/server` |
| Route Handler | `createClient()` (anon) | `@/lib/supabase/server` |
| Client component (browser-side fetch) | `createClient()` (anon) | `@/lib/supabase/client` |
| Admin operations (bypass RLS) | `createAdminClient()` (service_role) | `@/lib/supabase/server` |

Never use `createAdminClient()` for regular user operations — it bypasses RLS entirely. It's only for `lib/actions/admin.ts` and `scripts/create-admin.ts`.

### TypeScript types
`types/db.ts` is hand-written — there is no `supabase gen types` in the build pipeline. The interfaces must mirror `supabase/migrations/` exactly. When adding a migration, update `types/db.ts` to match.

## Common Reference Data

### VAT rates
`VAT_RATES = [8, 10]` (defined in `lib/calc.ts`). 8% is the default. Only these two values are valid — the DB check constraint enforces it.

### Order statuses
`"draft"` → `"confirmed"` → `"closed"` (one-way progression in practice, though not enforced by DB)

### Delivery statuses
`"draft"` | `"delivered"` | `"cancelled"` (default on create: `"delivered"`)

### Payment statuses
`"unpaid"` | `"paid"`

### User roles
`"admin"` | `"staff"` (locked at signup — `handle_new_user()` hardcodes `'staff'`)
