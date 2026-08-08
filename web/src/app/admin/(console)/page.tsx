import Link from "next/link";
import {
  createServiceClient,
  hasServiceRoleKey,
  requireAdmin,
} from "@/lib/admin";

type RecentAssessment = {
  id: string;
  user_id: string;
  risk_category: string;
  risk_level: string;
  your_score: number;
  national_benchmark: number;
  created_at: string;
};

type KpiCard = {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  icon: string;
};

export const dynamic = "force-dynamic";

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  let userCount = 0;
  let profileCount = 0;
  let resultCount = 0;
  let statsCount = 0;
  let traceCount = 0;
  let recent: RecentAssessment[] = [];
  let riskLevelRows: { risk_level: string; n: number }[] = [];
  let loadError: string | null = null;

  if (hasServiceRoleKey()) {
    try {
      const admin = createServiceClient();
      const [users, profiles, results, stats, traces, latest, levels] =
        await Promise.all([
          admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
          admin.from("profiles").select("id", { count: "exact", head: true }),
          admin
            .from("risk_results")
            .select("id", { count: "exact", head: true }),
          admin
            .from("health_reference_stats")
            .select("id", { count: "exact", head: true }),
          admin.from("agent_traces").select("id", { count: "exact", head: true }),
          admin
            .from("risk_results")
            .select(
              "id, user_id, risk_category, risk_level, your_score, national_benchmark, created_at",
            )
            .order("created_at", { ascending: false })
            .limit(6),
          admin.from("risk_results").select("risk_level"),
        ]);

      userCount =
        typeof (users.data as { total?: number }).total === "number"
          ? (users.data as { total: number }).total
          : users.data.users.length;
      profileCount = profiles.count ?? 0;
      resultCount = results.count ?? 0;
      statsCount = stats.count ?? 0;
      traceCount = traces.error ? 0 : traces.count ?? 0;
      recent = (latest.data || []) as RecentAssessment[];

      const map = new Map<string, number>();
      for (const row of levels.data || []) {
        const key = row.risk_level || "Unknown";
        map.set(key, (map.get(key) || 0) + 1);
      }
      riskLevelRows = [...map.entries()]
        .map(([risk_level, n]) => ({ risk_level, n }))
        .sort((a, b) => b.n - a.n);
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "Failed to load admin data";
    }
  }

  const completion = pct(profileCount, userCount);
  const kpis: KpiCard[] = [
    {
      label: "Registered users",
      value: userCount,
      detail: `${completion}% have completed a profile`,
      href: "/admin/users",
      icon: "group",
    },
    {
      label: "Profiles",
      value: profileCount,
      detail: "Anonymous assessment profiles",
      href: "/admin/users",
      icon: "badge",
    },
    {
      label: "Assessments",
      value: resultCount,
      detail: "Rule-based risk result rows",
      href: "/admin/assessments",
      icon: "analytics",
    },
    {
      label: "Reference stats",
      value: statsCount,
      detail: "NHMS / DOSM context rows",
      href: "/admin/stats",
      icon: "database",
    },
    {
      label: "Agent traces",
      value: traceCount,
      detail: "Persisted AI observability records",
      href: "/admin/traces",
      icon: "timeline",
    },
  ];

  return (
    <div>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Operations overview
          </p>
          <h2 className="mt-2 font-headline text-3xl font-bold">
            Admin dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Monitor users, risk results, national reference data, and AI agent
            traces from one operator console.
          </p>
        </div>
        <Link
          href="/admin/system"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-outline-variant px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary"
        >
          <span className="material-symbols-outlined text-[18px]">
            settings_heart
          </span>
          System health
        </Link>
      </section>

      {loadError ? (
        <p className="mt-4 rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {loadError}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--elevation-soft)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">{card.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  {card.icon}
                </span>
              </span>
            </div>
            <p className="mt-4 font-headline text-3xl font-bold text-primary">
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-on-surface-variant">
              {card.detail}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="font-headline text-lg font-semibold">
            Risk level distribution
          </h3>
          {riskLevelRows.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">
              No assessments yet, or service role access is not configured.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {riskLevelRows.map((row) => {
                const width = pct(row.n, resultCount);
                return (
                  <div key={row.risk_level}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{row.risk_level}</span>
                      <span className="text-on-surface-variant">
                        {row.n} · {width}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-headline text-lg font-semibold">
              Recent assessments
            </h3>
            <Link
              href="/admin/assessments"
              className="text-sm font-semibold text-primary"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No recent assessments to show.
              </p>
            ) : (
              recent.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{row.risk_category}</p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {row.risk_level} · {row.your_score}%
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-on-surface-variant">
                    {row.user_id.slice(0, 8)}… ·{" "}
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5">
        <h3 className="font-headline text-lg font-semibold text-primary">
          Operator checklist
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            [
              "User roles",
              "Keep at least one admin and avoid demoting yourself.",
              "/admin/users",
            ],
            [
              "Reference stats",
              "Review NHMS / DOSM source rows before demos.",
              "/admin/stats",
            ],
            [
              "Agent evaluations",
              "Run safety, trace, and prompt replay checks before demos.",
              "/admin/evaluations",
            ],
          ].map(([title, copy, href]) => (
            <Link
              key={title}
              href={href}
              className="rounded-xl bg-surface-container-lowest p-4 text-sm shadow-sm transition hover:ring-2 hover:ring-primary/20"
            >
              <p className="font-semibold">{title}</p>
              <p className="mt-2 leading-6 text-on-surface-variant">{copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
