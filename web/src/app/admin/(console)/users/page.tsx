import Link from "next/link";
import { AdminRoleToggle } from "@/components/AdminRoleToggle";
import {
  createServiceClient,
  effectiveIsAdmin,
  hasServiceRoleKey,
  requireAdmin,
  type AppRole,
} from "@/lib/admin";

type ProfileRow = {
  user_id: string;
  age_group: string;
  gender: string;
  state: string;
  lifestyle: Record<string, unknown> | null;
  family_history: unknown;
  privacy_accepted_at: string | null;
  updated_at: string;
};

type RiskRow = {
  user_id: string;
  risk_category: string;
  risk_level: string;
  your_score: number;
  national_benchmark: number;
  created_at: string;
};

const PAGE_SIZE = 10;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const currentAdmin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  if (!hasServiceRoleKey()) {
    return (
      <div>
        <h2 className="font-headline text-2xl font-bold">Users</h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 text-sm">
          <p>
            To see registered emails, profiles, and all test assessments, add
            the Supabase <strong>service_role</strong> key (server-only).
          </p>
          <p className="text-on-surface-variant">
            Also run{" "}
            <code>supabase/migrations/003_user_roles.sql</code> before using
            Make admin / Remove admin.
          </p>
        </div>
      </div>
    );
  }

  const admin = createServiceClient();
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page,
    perPage: PAGE_SIZE,
  });

  if (authError) {
    return (
      <div>
        <h2 className="font-headline text-2xl font-bold">Users</h2>
        <p className="mt-4 text-sm text-error">{authError.message}</p>
      </div>
    );
  }

  const users = authData.users || [];
  const totalUsers =
    typeof (authData as { total?: number }).total === "number"
      ? (authData as { total: number }).total
      : null;
  const totalPages =
    totalUsers != null ? Math.max(1, Math.ceil(totalUsers / PAGE_SIZE)) : null;
  const hasPrev = page > 1;
  const hasNext =
    totalPages != null ? page < totalPages : users.length === PAGE_SIZE;

  const userIds = users.map((u) => u.id);
  let profiles: ProfileRow[] = [];
  let risks: RiskRow[] = [];
  const roleByUser = new Map<string, AppRole>();
  let rolesMissing = false;

  if (userIds.length > 0) {
    const [profileRes, riskRes, roleRes] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "user_id, age_group, gender, state, lifestyle, family_history, privacy_accepted_at, updated_at",
        )
        .in("user_id", userIds),
      admin
        .from("risk_results")
        .select(
          "user_id, risk_category, risk_level, your_score, national_benchmark, created_at",
        )
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
      admin.from("user_roles").select("user_id, role").in("user_id", userIds),
    ]);
    profiles = (profileRes.data || []) as ProfileRow[];
    risks = (riskRes.data || []) as RiskRow[];
    if (roleRes.error) {
      rolesMissing = true;
    } else {
      for (const row of roleRes.data || []) {
        roleByUser.set(row.user_id, row.role as AppRole);
      }
    }
  }

  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));
  const latestRiskByUser = new Map<string, RiskRow>();
  for (const row of risks) {
    if (!latestRiskByUser.has(row.user_id)) {
      latestRiskByUser.set(row.user_id, row);
    }
  }
  const assessmentCount = new Map<string, number>();
  for (const row of risks) {
    assessmentCount.set(
      row.user_id,
      (assessmentCount.get(row.user_id) || 0) + 1,
    );
  }

  const from = users.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + users.length;

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold">Users</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Registered accounts, profile inputs, latest assessment, and admin role.
        {totalUsers != null
          ? ` ${totalUsers} users total · showing ${from}–${to}.`
          : ` Showing ${from}–${to} · page ${page}.`}
      </p>
      {rolesMissing ? (
        <p className="mt-3 rounded-xl bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
          Run <code>003_user_roles.sql</code> in Supabase SQL Editor to enable
          Make admin / Remove admin.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Signed up</th>
              <th className="px-4 py-3 font-semibold">Profile</th>
              <th className="px-4 py-3 font-semibold">Lifestyle / family</th>
              <th className="px-4 py-3 font-semibold">Latest test</th>
              <th className="px-4 py-3 font-semibold"># tests</th>
              <th className="px-4 py-3 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No registered users on this page.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const profile = profileByUser.get(user.id);
                const risk = latestRiskByUser.get(user.id);
                const role = roleByUser.get(user.id) ?? null;
                const isAdmin = effectiveIsAdmin(role, user.email);
                const lifestyle = profile?.lifestyle || {};
                const flags = [
                  lifestyle.smoker ? "smoker" : null,
                  lifestyle.active_exercise ? "exercise" : null,
                  lifestyle.high_sugar ? "high sugar" : null,
                ].filter(Boolean);
                const family = Array.isArray(profile?.family_history)
                  ? (profile?.family_history as string[]).join(", ")
                  : "";

                return (
                  <tr
                    key={user.id}
                    className="border-t border-outline-variant/20 align-top"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.email || "—"}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-on-surface-variant">
                        {user.id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {profile ? (
                        <>
                          <p>
                            {profile.age_group} · {profile.gender}
                          </p>
                          <p className="text-on-surface-variant">
                            {profile.state}
                          </p>
                        </>
                      ) : (
                        <span className="text-on-surface-variant">
                          No profile yet
                        </span>
                      )}
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 text-on-surface-variant">
                      {profile ? (
                        <>
                          <p>{flags.length ? flags.join(", ") : "no flags"}</p>
                          <p className="mt-1">
                            Family: {family || "none"}
                          </p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {risk ? (
                        <>
                          <p className="font-semibold text-primary">
                            {risk.risk_level} · {risk.your_score}%
                          </p>
                          <p className="text-on-surface-variant">
                            {risk.risk_category}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {new Date(risk.created_at).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <span className="text-on-surface-variant">
                          No assessment
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {assessmentCount.get(user.id) || 0}
                    </td>
                    <td className="px-4 py-3">
                      {rolesMissing ? (
                        <span className="text-xs text-on-surface-variant">
                          —
                        </span>
                      ) : (
                        <AdminRoleToggle
                          userId={user.id}
                          email={user.email || ""}
                          isAdmin={isAdmin}
                          isSelf={user.id === currentAdmin.id}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          Page {page}
          {totalPages != null ? ` of ${totalPages}` : ""} · {PAGE_SIZE} per page
        </p>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link
              href={`/admin/users?page=${page - 1}`}
              className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-primary"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-full border border-outline-variant/40 px-4 py-2 text-sm text-on-surface-variant opacity-40">
              Previous
            </span>
          )}
          {hasNext ? (
            <Link
              href={`/admin/users?page=${page + 1}`}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-full bg-primary/40 px-4 py-2 text-sm font-semibold text-on-primary opacity-50">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
