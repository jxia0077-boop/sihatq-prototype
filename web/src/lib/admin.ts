import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type AppRole = "user" | "admin";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowlist = getAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Bypasses RLS — server-only. Never expose to the browser. */
export function createServiceClient() {
  const { url } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it in .env.local for admin data access.",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve DB role; null if no row yet. */
export async function getUserRole(userId: string): Promise<AppRole | null> {
  if (!hasServiceRoleKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.role as AppRole | undefined) || null;
  }

  const admin = createServiceClient();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as AppRole | undefined) || null;
}

/**
 * Admin if:
 * - user_roles.role === 'admin', or
 * - no DB role row yet AND email is in ADMIN_EMAILS (bootstrap allowlist)
 * Explicit role === 'user' removes admin even if email is allowlisted.
 */
export async function isAdminUser(user: User | null | undefined): Promise<boolean> {
  if (!user) return false;
  const role = await getUserRole(user.id);
  if (role === "admin") return true;
  if (role === "user") return false;
  return isAdminEmail(user.email);
}

export function effectiveIsAdmin(
  role: AppRole | null | undefined,
  email: string | undefined | null,
): boolean {
  if (role === "admin") return true;
  if (role === "user") return false;
  return isAdminEmail(email);
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!(await isAdminUser(user))) {
    redirect("/admin/forbidden");
  }

  return user;
}
