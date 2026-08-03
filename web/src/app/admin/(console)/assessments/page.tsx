import { createServiceClient, hasServiceRoleKey } from "@/lib/admin";

type AssessmentRow = {
  id: string;
  user_id: string;
  risk_category: string;
  risk_level: string;
  your_score: number;
  national_benchmark: number;
  created_at: string;
  explanation: string | null;
};

export default async function AdminAssessmentsPage() {
  let rows: AssessmentRow[] = [];
  const emailByUser = new Map<string, string>();
  let note: string | null = null;

  if (!hasServiceRoleKey()) {
    note =
      "Add SUPABASE_SERVICE_ROLE_KEY to list all users’ assessments (RLS blocks cross-user reads). See /admin/users for setup steps.";
  } else {
    const admin = createServiceClient();
    const [{ data, error }, { data: authData }] = await Promise.all([
      admin
        .from("risk_results")
        .select(
          "id, user_id, risk_category, risk_level, your_score, national_benchmark, created_at, explanation",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
    ]);

    if (error) {
      note = error.message;
    } else {
      rows = (data || []) as AssessmentRow[];
      for (const user of authData?.users || []) {
        if (user.email) emailByUser.set(user.id, user.email);
      }
    }
  }

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold">Assessments</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Latest 50 risk results across all users (read-only).
      </p>
      {note ? (
        <p className="mt-4 rounded-xl bg-surface-container px-4 py-3 text-sm">
          {note}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">National</th>
              <th className="px-4 py-3 font-semibold">Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No rows to show.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-outline-variant/20 align-top"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {emailByUser.get(row.user_id) || "Unknown"}
                    </p>
                    <p className="font-mono text-[10px] text-on-surface-variant">
                      {row.user_id.slice(0, 8)}…
                    </p>
                  </td>
                  <td className="px-4 py-3">{row.risk_category}</td>
                  <td className="px-4 py-3 font-semibold text-primary">
                    {row.risk_level}
                  </td>
                  <td className="px-4 py-3">{row.your_score}%</td>
                  <td className="px-4 py-3">{row.national_benchmark}%</td>
                  <td className="max-w-[16rem] px-4 py-3 text-on-surface-variant">
                    {(row.explanation || "").slice(0, 120)}
                    {(row.explanation || "").length > 120 ? "…" : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
