"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Profile, UserRole } from "@/types/db";

export interface UserWithEmail extends Profile {
  email?: string | null;
}

export async function listUsers(): Promise<{ data?: UserWithEmail[]; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (pErr) return { error: pErr.message };

  const users: UserWithEmail[] = (profiles as Profile[]).map((p) => ({
    ...p,
    email: null,
  }));

  // Try to fetch emails via admin API if service role key is available
  try {
    const admin = await createAdminClient();
    const { data: authUsers } = await admin.auth.admin.listUsers();
    if (authUsers?.users) {
      const emailMap = new Map<string, string>();
      for (const u of authUsers.users) {
        emailMap.set(u.id, u.email ?? "");
      }
      for (const u of users) {
        u.email = emailMap.get(u.id) ?? null;
      }
    }
  } catch {
    // No service role key — emails stay null, UI degrades gracefully
  }

  return { data: users };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const ctx = await requireAdmin();
  const t = await getTranslations("errors");
  if (userId === ctx.user.id) return { error: t("cannotSelfChangeRole") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin();
  const t = await getTranslations("errors");

  if (!newPassword || newPassword.length < 6) {
    return { error: t("passwordMinLength") };
  }

  try {
    const admin = await createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) return { error: error.message };
  } catch {
    return { error: t("noServiceRolePassword") };
  }
  revalidatePath("/admin/users");
}

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
  const t = await getTranslations("errors");
  if (!email || !password) return { error: t("emailPasswordRequired") };

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
    return { error: t("noServiceRoleCreateUser") };
  }

  revalidatePath("/admin/users");
}
