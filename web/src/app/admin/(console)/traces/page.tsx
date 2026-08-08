import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { listTraces } from "@/lib/agent/observability/store";

export const dynamic = "force-dynamic";

export default async function AdminTracesPage() {
  await requireAdmin();
  const { rows, source, note } = await listTraces(50);

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold">Agent traces</h2>
      <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
        Read-only audit of agent runs: model protocol, tools, gate results, and
        latency. Source: <code>{source}</code>
        {note ? ` — ${note}` : ""}.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">ms</th>
              <th className="px-4 py-3 font-semibold">Question</th>
              <th className="px-4 py-3 font-semibold">Steps</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No traces yet. Ask the AI assistant, then refresh. For durable
                  storage run{" "}
                  <code>supabase/migrations/006_agent_traces.sql</code>.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-outline-variant/20 hover:bg-surface-container/60"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                    {new Date(row.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{row.mode}</td>
                  <td className="px-4 py-3">{row.duration_ms ?? "—"}</td>
                  <td className="max-w-md px-4 py-3">
                    <Link
                      href={`/admin/traces/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.question.slice(0, 120)}
                      {row.question.length > 120 ? "…" : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.steps?.length ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
