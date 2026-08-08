import {
  getAdminEmails,
  createServiceClient,
  hasServiceRoleKey,
  requireAdmin,
} from "@/lib/admin";
import { listTraces } from "@/lib/agent/observability/store";
import { getSupabaseEnv } from "@/lib/supabase/env";

type Check = {
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
};

const TABLES = [
  "profiles",
  "risk_results",
  "health_reference_stats",
  "user_roles",
  "agent_traces",
] as const;

function badgeClass(status: Check["status"]) {
  if (status === "ok") return "bg-primary/10 text-primary";
  if (status === "warn") {
    return "bg-secondary-container text-on-secondary-container";
  }
  return "bg-error-container text-on-error-container";
}

export default async function AdminSystemPage() {
  await requireAdmin();
  const { url, key } = getSupabaseEnv();
  const serviceRole = hasServiceRoleKey();
  const adminEmails = getAdminEmails();
  const traceInfo = await listTraces(1);

  const checks: Check[] = [
    {
      label: "Supabase URL",
      status: url ? "ok" : "error",
      detail: url ? "Configured" : "Missing NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      label: "Supabase anon key",
      status: key ? "ok" : "error",
      detail: key ? "Configured" : "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    {
      label: "Service role key",
      status: serviceRole ? "ok" : "warn",
      detail: serviceRole
        ? "Admin reads and writes are enabled server-side"
        : "Limited mode: cross-user reads and admin writes are disabled",
    },
    {
      label: "Admin bootstrap",
      status: adminEmails.length > 0 ? "ok" : "warn",
      detail:
        adminEmails.length > 0
          ? `${adminEmails.length} allowlisted email${adminEmails.length === 1 ? "" : "s"}`
          : "ADMIN_EMAILS is empty; use user_roles for all admin access",
    },
    {
      label: "Agent trace storage",
      status: traceInfo.source === "db" ? "ok" : "warn",
      detail:
        traceInfo.source === "db"
          ? "Persisting to database"
          : traceInfo.note || `Using ${traceInfo.source} trace storage`,
    },
  ];

  const tableChecks: Check[] = [];
  if (serviceRole) {
    const admin = createServiceClient();
    for (const table of TABLES) {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });
      tableChecks.push({
        label: table,
        status: error ? "warn" : "ok",
        detail: error ? error.message : `${count ?? 0} row${count === 1 ? "" : "s"}`,
      });
    }
  } else {
    for (const table of TABLES) {
      tableChecks.push({
        label: table,
        status: "warn",
        detail: "Skipped without SUPABASE_SERVICE_ROLE_KEY",
      });
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        System health
      </p>
      <h2 className="mt-2 font-headline text-3xl font-bold">
        Backend readiness
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
        Environment, table availability, admin bootstrap, and trace persistence
        checks for demo readiness.
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <article
            key={check.label}
            className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-headline text-lg font-semibold">
                {check.label}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(
                  check.status,
                )}`}
              >
                {check.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {check.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
        <h3 className="font-headline text-lg font-semibold">Database tables</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-on-surface-variant">
              <tr>
                <th className="border-b border-outline-variant/20 px-3 py-2 font-semibold">
                  Table
                </th>
                <th className="border-b border-outline-variant/20 px-3 py-2 font-semibold">
                  Status
                </th>
                <th className="border-b border-outline-variant/20 px-3 py-2 font-semibold">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {tableChecks.map((check) => (
                <tr key={check.label}>
                  <td className="border-b border-outline-variant/12 px-3 py-3 font-mono text-xs">
                    {check.label}
                  </td>
                  <td className="border-b border-outline-variant/12 px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(
                        check.status,
                      )}`}
                    >
                      {check.status}
                    </span>
                  </td>
                  <td className="border-b border-outline-variant/12 px-3 py-3 text-on-surface-variant">
                    {check.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5">
        <h3 className="font-headline text-lg font-semibold text-primary">
          Recommended setup
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
          <li>Run migrations `001_init.sql` through `006_agent_traces.sql`.</li>
          <li>Set `ADMIN_EMAILS` for bootstrap access or use `user_roles`.</li>
          <li>
            Set `SUPABASE_SERVICE_ROLE_KEY` locally and in hosted runtime for
            full admin reads and writes.
          </li>
        </ul>
      </section>
    </div>
  );
}
