# P0.3 Reusable Admin-Creator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a secure, reusable admin-creator that closes the cold-start/lockout gap (CLI script) and fixes the admin UI's silently-ignored "Admin" role (runtime), with no hardcoded credentials.

**Architecture:** (1) A standalone `scripts/create-admin.ts` run via `tsx`, using the Supabase service role to create-or-promote a user to admin — independent of the Next runtime so it works during lockout. (2) A surgical fix to `lib/actions/admin.ts` `createUser` that upserts `role='admin'` after the locked trigger sets `'staff'`.

**Tech Stack:** Next.js 16, TypeScript (strict), `@supabase/supabase-js` v2 (already a dep), `tsx` (new devDep), Supabase (service-role admin API).

**Verification approach (read me):** This project has **no test framework** (only `eslint` + `typescript`) and its convention is `npx tsc --noEmit` + real browser/run testing. So tasks verify **behaviorally** — typecheck, a no-arg dry run of the script (touches no DB), a browser test of the UI fix, and a live create-or-promote E2E — rather than fabricating unit tests against mocked Supabase APIs. Do not add a test framework as part of this plan.

---

## File Structure

- **Create** `scripts/create-admin.ts` — standalone CLI: loads `.env.local`, parses args, validates, create-or-promote via service role. Single responsibility: bootstrap/promote an admin outside the app.
- **Modify** `package.json` — add `tsx` devDep; add `create-admin` npm script.
- **Modify** `lib/actions/admin.ts` (`createUser`, ~lines 81–109) — capture created user id; upsert `role='admin'` when an admin was requested.

No other files change. `scripts/` stays tracked (no secrets inside); `.env.local` is already gitignored (`.env*`).

---

## Task 1: Add `tsx` devDep and `create-admin` npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the dependency and script**

In `package.json`, add `tsx` to `devDependencies` and a `create-admin` entry to `scripts`. The two blocks become:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "create-admin": "tsx scripts/create-admin.ts"
  },
```

```json
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.10",
    "tailwindcss": "^4",
    "tsx": "^4",
    "typescript": "^5"
  }
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: installs `tsx` (4.x); no errors.

- [ ] **Step 3: Verify tsx is runnable**

Run: `npx tsx --version`
Expected: prints a 4.x version string.

- [ ] **Step 4: Typecheck (no regression)**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add tsx devDep and create-admin script runner"
```

---

## Task 2: Create `scripts/create-admin.ts`

**Files:**
- Create: `scripts/create-admin.ts`

- [ ] **Step 1: Create the script with this exact content**

```ts
// scripts/create-admin.ts
// P0.3 — Reusable admin-creator (service-role, create-or-promote).
// Credentials come ONLY from env (.env.local) or CLI args — never hardcoded.
//
// Usage:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin
//   npm run create-admin -- --email a@b.c --password secret [--name "Full Name"]
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Minimal .env.local loader — no deps, any Node version. Never overwrites existing env. */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[++i];
    else if (a === "--password") out.password = argv[++i];
    else if (a === "--name") out.name = argv[++i];
  }
  return out;
}

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  console.error(
    "Usage:\n" +
      '  npm run create-admin -- --email <email> --password <pw> [--name "Name"]\n' +
      "  or set ADMIN_EMAIL / ADMIN_PASSWORD (+ optional ADMIN_FULL_NAME) in .env.local\n",
  );
  process.exit(1);
}

/** Page through auth users to find an id by email (no getByEmail in the admin API). */
async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string,
  perPage = 1000,
): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
    page++;
  }
}

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = (args.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = args.password ?? process.env.ADMIN_PASSWORD ?? "";
  const fullName = (args.name ?? process.env.ADMIN_FULL_NAME ?? "").trim() || null;

  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing (check .env.local)");
  if (!serviceKey) fail("SUPABASE_SERVICE_ROLE_KEY is missing (check .env.local)");
  if (!email) fail("Admin email is required");
  if (!password) fail("Admin password is required");
  if (password.length < 8) fail("Password must be at least 8 characters");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (!createErr && created.user) {
    userId = created.user.id;
    console.log(`✓ Created new auth user: ${email}`);
  } else if (createErr) {
    const existing = await findUserIdByEmail(admin, email);
    if (!existing) fail(`Could not create user and none exists: ${createErr.message}`);
    userId = existing;
    const { error: updErr } = await admin.auth.admin.updateUserById(existing, {
      password,
      email_confirm: true,
    });
    if (updErr) fail(`Found existing user but password reset failed: ${updErr.message}`);
    console.log(`✓ Existing user found — password reset: ${email}`);
  }

  if (!userId) fail("Failed to resolve a user id");

  // Trigger locks new profiles to 'staff' (P1.3). Override via service role.
  const { error: roleErr } = await admin
    .from("profiles")
    .upsert(
      { id: userId, role: "admin", ...(fullName ? { full_name: fullName } : {}) },
      { onConflict: "id" },
    );
  if (roleErr) fail(`User ready but failed to set admin role: ${roleErr.message}`);

  console.log(`✓ Role set to admin for ${email} (id: ${userId})`);
  console.log("\nDone. This account can now sign in at /login with admin access.");
}

main().catch((err) => {
  console.error(`\n✖ Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck the script (tsconfig includes `**/*.ts`)**

Run: `npx tsc --noEmit`
Expected: exit 0, no output. (If it errors on `node:fs`/`process`, confirm `@types/node` is installed — it is, in devDependencies.)

- [ ] **Step 3: Dry-run validation (touches NO database)**

Run: `npm run create-admin`
Expected: prints `✖ Admin email is required` followed by the usage block, and exits with code 1. (`.env.local` supplies URL + service key, but `ADMIN_EMAIL` is absent, so it stops before any API call.)

Confirm exit code: `npm run create-admin; echo $?`
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-admin.ts
git commit -m "feat(scripts): reusable service-role admin-creator (P0.3)"
```

---

## Task 3: Fix `createUser` so the UI "Admin" role actually grants admin

**Files:**
- Modify: `lib/actions/admin.ts` (the `createUser` function, ~lines 81–109)

- [ ] **Step 1: Replace the `createUser` function body**

In `lib/actions/admin.ts`, replace the entire `createUser` function with:

```ts
export async function createUser({
  email,
  password,
  full_name,
  role,
}: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}) {
  await requireAdmin();
  if (!email || !password) return { error: "Email và mật khẩu là bắt buộc" };

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (error) return { error: error.message };

    // The signup trigger locks new profiles to role='staff' (P1.3). Promote now
    // via the service role when an admin was requested.
    if (role === "admin" && data.user?.id) {
      const { error: roleErr } = await admin
        .from("profiles")
        .upsert({ id: data.user.id, role: "admin" }, { onConflict: "id" });
      if (roleErr) return { error: roleErr.message };
    }
  } catch {
    return { error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY — không thể tạo người dùng" };
  }

  revalidatePath("/admin/users");
}
```

(The only changes vs. the current code: destructure `data` alongside `error`, and add the `if (role === "admin" …)` upsert block.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Browser-verify the runtime fix**

1. `npm run dev`, open http://localhost:3000/login, sign in as an existing admin.
2. Go to **/admin/users** → **Tạo người dùng**.
3. Create a user with email `admin-fix-test@example.com`, a 6+ char password, **Vai trò = Admin**.
4. In the Supabase Dashboard → Table Editor → `profiles`, confirm the new row has `role = 'admin'` (not `'staff'`).
5. Delete the test user (Dashboard → Authentication → Users → delete) to clean up.

Expected: the new profile's `role` is `admin`. (Before this fix it would be `staff`.)

- [ ] **Step 4: Commit**

```bash
git add lib/actions/admin.ts
git commit -m "fix(admin): grant admin role on user create (bypass P1.3 trigger lock)"
```

---

## Task 4: Live create-or-promote E2E, deploy, and record completion

**Files:** none (verification + deploy + memory update)

- [ ] **Step 1: E2E — create path, against the live project**

Pick a throwaway email, e.g. `admin-e2e@example.com`, and a strong password. Run:

`npm run create-admin -- --email admin-e2e@example.com --password '<strong-8+>' --name "E2E Test"`

Expected output includes:
```
✓ Created new auth user: admin-e2e@example.com
✓ Role set to admin for admin-e2e@example.com (id: <uuid>)
```
Confirm in Supabase Dashboard → `profiles` that `role = 'admin'`, then **delete** the test user.

- [ ] **Step 2: E2E — promote path (existing user)**

Re-run the same command against the email of an existing **staff** user (or re-run immediately after Step 1's user exists). Expected:

```
✓ Existing user found — password reset: <email>
✓ Role set to admin for <email> (id: <uuid>)
```
(Then restore that user's intended role via the UI/dashboard if needed.)

- [ ] **Step 3: Final typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Deploy the runtime fix to Vercel**

Run: `vercel --prod --yes`
Expected: build succeeds, status READY, aliased to https://yaoyun.vercel.app. (Env vars already configured.)

- [ ] **Step 5: Update security-hardening memory**

Edit `C:\Users\Vinhq\.claude\projects\d--Project-Yao-Yun\memory\yaoyun-security-hardening.md`: change the **P0.3** bullet from *PENDING* to *DONE*, noting `scripts/create-admin.ts` (env/args, create-or-promote, service role) plus the `createUser` runtime fix; mention verification done.

- [ ] **Step 6: Optional — push everything**

The repo currently has a large uncommitted working tree (all app code) plus the new commits. When ready:

```bash
git add -A
git commit -m "feat: app + P0.3 admin-creator"
git push origin master
```
(This is optional/operational — confirm with the user first.)

---

## Self-Review (completed by plan author)

- **Spec coverage:** Part 1 (CLI script) → Tasks 1–2 + E2E in Task 4. Part 2 (runtime fix) → Task 3. Verification + deploy + memory → Task 4. All spec sections mapped. ✓
- **Placeholder scan:** No TBD/TODO; every code step has full code; every command has expected output. ✓
- **Type consistency:** `createUser` attrs (`email_confirm`, `user_metadata`), `updateUserById`, `listUsers({ page, perPage })`, `profiles.upsert({ onConflict: 'id' })`, `SupabaseClient` import — consistent across the script and the runtime fix. ✓
- **Scope:** Single feature, one plan. ✓
