import {
  createServiceClient,
  hasServiceRoleKey,
  requireAdmin,
} from "@/lib/admin";
import type { Recommendation } from "@/lib/types";

type AssessmentRow = {
  id: string;
  user_id: string;
  risk_category: string;
  risk_level: string;
  explanation: string;
  comparison_text: string;
  recommendations: Recommendation[] | null;
  your_score: number;
  national_benchmark: number;
  created_at: string;
};

export const dynamic = "force-dynamic";

function shortId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function scoreDelta(row: AssessmentRow) {
  return Number(row.your_score) - Number(row.national_benchmark);
}

function sanitizeSearch(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
}

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const level = (params.level || "").trim();
  const q = (params.q || "").trim();
  const safeQuery = sanitizeSearch(q);

  let rows: AssessmentRow[] = [];
  let allRows: { risk_level: string; your_score: number }[] = [];
  let note: string | null = null;

  if (!hasServiceRoleKey()) {
    note =
      "Add SUPABASE_SERVICE_ROLE_KEY to list all users’ assessments (RLS blocks cross-user reads).";
  } else {
    const admin = createServiceClient();
    let query = admin
      .from("risk_results")
      .select(
        "id, user_id, risk_category, risk_level, explanation, comparison_text, recommendations, your_score, national_benchmark, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(80);

    if (level) {
      query = query.eq("risk_level", level);
    }
    if (safeQuery) {
      query = query.or(
        `risk_category.ilike.%${safeQuery}%,explanation.ilike.%${safeQuery}%,comparison_text.ilike.%${safeQuery}%`,
      );
    }

    const [filtered, all] = await Promise.all([
      query,
      admin.from("risk_results").select("risk_level, your_score"),
    ]);

    if (filtered.error) {
      note = filtered.error.message;
    } else {
      rows = (filtered.data || []) as AssessmentRow[];
    }
    allRows = (all.data || []) as { risk_level: string; your_score: number }[];
  }

  const averageScore =
    allRows.length > 0
      ? Math.round(
          allRows.reduce((sum, row) => sum + Number(row.your_score || 0), 0) /
            allRows.length,
        )
      : 0;
  const highCount = allRows.filter((row) =>
    /high|elevated|moderate/i.test(row.risk_level || ""),
  ).length;
  const levelOptions = [...new Set(allRows.map((row) => row.risk_level).filter(Boolean))];

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Assessment operations
          </p>
          <h2 className="mt-2 font-headline text-3xl font-bold">
            Assessments
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Latest cross-user risk results, score deltas, recommendations, and
            safety context. Read-only for data integrity.
          </p>
        </div>
      </div>

      {note ? (
        <p className="mt-4 rounded-xl bg-surface-container px-4 py-3 text-sm">
          {note}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Total results", allRows.length, "All time rows"],
          ["Average score", `${averageScore}%`, "Across all result rows"],
          ["Attention cases", highCount, "High/moderate style labels"],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm"
          >
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className="mt-2 font-headline text-3xl font-bold text-primary">
              {value}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>
          </div>
        ))}
      </div>

      <form className="mt-6 grid gap-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="text-sm">
          <span className="text-on-surface-variant">Search context</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="diabetes, NHMS, lifestyle..."
            className="mt-1 w-full rounded-xl border border-outline-variant/35 bg-surface px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <label className="text-sm">
          <span className="text-on-surface-variant">Risk level</span>
          <select
            name="level"
            defaultValue={level}
            className="mt-1 w-full rounded-xl border border-outline-variant/35 bg-surface px-3 py-2 outline-none focus:border-primary"
          >
            <option value="">All levels</option>
            {levelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Result</th>
              <th className="px-4 py-3 font-semibold">Scores</th>
              <th className="px-4 py-3 font-semibold">Recommendations</th>
              <th className="px-4 py-3 font-semibold">Context</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No rows to show.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const delta = scoreDelta(row);
                return (
                  <tr
                    key={row.id}
                    className="border-t border-outline-variant/20 align-top"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {shortId(row.user_id)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.risk_category}</p>
                      <p className="mt-1 text-primary">{row.risk_level}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-primary">
                        {row.your_score}% vs {row.national_benchmark}%
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {delta >= 0 ? "+" : ""}
                        {delta} from benchmark
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {(row.recommendations || []).length} item
                      {(row.recommendations || []).length === 1 ? "" : "s"}
                    </td>
                    <td className="max-w-sm px-4 py-3 text-on-surface-variant">
                      <p className="line-clamp-2">{row.explanation}</p>
                      <p className="mt-2 line-clamp-2 text-xs">
                        {row.comparison_text}
                      </p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
