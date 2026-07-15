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
