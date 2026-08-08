import Link from "next/link";
import {
  createServiceClient,
  hasServiceRoleKey,
  requireAdmin,
} from "@/lib/admin";

export default async function AdminOverviewPage() {
  await requireAdmin();

  let profileCount = 0;
  let resultCount = 0;
  let statsCount = 0;
  let recentLevel: { risk_level: string; n: number }[] = [];
  let loadError: string | null = null;

  if (hasServiceRoleKey()) {
    try {
      const admin = createServiceClient();
      const [profiles, results, stats, levels] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("risk_results").select("id", { count: "exact", head: true }),
        admin
          .from("health_reference_stats")
          .select("id", { count: "exact", head: true }),
        admin.from("risk_results").select("risk_level"),
      ]);

      profileCount = profiles.count ?? 0;
      resultCount = results.count ?? 0;
      statsCount = stats.count ?? 0;

      const map = new Map<string, number>();
      for (const row of levels.data || []) {
        const key = row.risk_level || "Unknown";
        map.set(key, (map.get(key) || 0) + 1);
      }
      recentLevel = [...map.entries()].map(([risk_level, n]) => ({
        risk_level,
        n,
      }));
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "Failed to load admin stats";
    }
  }

  const cards: { label: string; value: string | number; href: string }[] = [
    { label: "Profiles", value: profileCount, href: "/admin/assessments" },
    { label: "Assessments", value: resultCount, href: "/admin/assessments" },
    { label: "Reference stats", value: statsCount, href: "/admin/stats" },
    { label: "Agent traces", value: "View", href: "/admin/traces" },
  ];

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold">Overview</h2>
      <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
        Manage national reference data and review assessments. This console is
        for operators — not end users.
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-error">{loadError}</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition hover:ring-2 hover:ring-primary/30"
          >
            <p className="text-sm text-on-surface-variant">{card.label}</p>
            <p className="mt-2 font-headline text-3xl font-bold text-primary">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
        <h3 className="font-headline text-lg font-semibold">
          Risk level distribution
        </h3>
        {recentLevel.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            No assessments yet (or service role key not configured).
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {recentLevel.map((row) => (
              <li
                key={row.risk_level}
                className="flex justify-between rounded-lg bg-surface-container px-3 py-2 text-sm"
              >
                <span>{row.risk_level}</span>
                <span className="font-semibold text-primary">{row.n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
