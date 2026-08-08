import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getTrace } from "@/lib/agent/observability/store";

export const dynamic = "force-dynamic";

export default async function AdminTraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const trace = await getTrace(id);
  if (!trace) notFound();

  const json = JSON.stringify(trace, null, 2);

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/traces" className="text-primary hover:underline">
          ← All traces
        </Link>
      </p>
      <h2 className="mt-3 font-headline text-2xl font-bold">Trace detail</h2>
      <p className="mt-2 font-mono text-xs text-on-surface-variant">{trace.id}</p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-on-surface-variant">Status</dt>
          <dd className="font-medium">{trace.status}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Mode</dt>
          <dd className="font-medium">{trace.mode}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Duration</dt>
          <dd className="font-medium">
            {trace.duration_ms != null ? `${trace.duration_ms} ms` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Session</dt>
          <dd className="font-mono text-xs">{trace.session_id || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-on-surface-variant">Question</dt>
          <dd className="mt-1">{trace.question}</dd>
        </div>
        {trace.answer_preview ? (
          <div className="sm:col-span-2">
            <dt className="text-on-surface-variant">Answer preview</dt>
            <dd className="mt-1 whitespace-pre-wrap text-on-surface-variant">
              {trace.answer_preview}
            </dd>
          </div>
        ) : null}
      </dl>

      <h3 className="mt-8 font-headline text-lg font-semibold">Steps</h3>
      <ol className="mt-3 space-y-2">
        {(trace.steps || []).map((step, i) => (
          <li
            key={`${step.ts}-${i}`}
            className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {step.type}
              </span>
              <span className="font-medium">{step.label || step.tool || "—"}</span>
              {step.latencyMs != null ? (
                <span className="text-xs text-on-surface-variant">
                  {step.latencyMs}ms
                </span>
              ) : null}
              {step.protocol ? (
                <span className="text-xs text-on-surface-variant">
                  {step.protocol}/{step.provider} · {step.model}
                </span>
              ) : null}
            </div>
            {step.detail || step.reason ? (
              <p className="mt-1 text-on-surface-variant">
                {step.detail || step.reason}
              </p>
            ) : null}
            {(step.promptTokens != null || step.completionTokens != null) && (
              <p className="mt-1 text-xs text-on-surface-variant">
                tokens: in={step.promptTokens ?? "?"} out=
                {step.completionTokens ?? "?"}
              </p>
            )}
          </li>
        ))}
      </ol>

      <h3 className="mt-8 font-headline text-lg font-semibold">Export JSON</h3>
      <pre className="mt-3 max-h-[28rem] overflow-auto rounded-2xl border border-outline-variant/30 bg-surface-container p-4 text-xs">
        {json}
      </pre>
      <p className="mt-2 text-xs text-on-surface-variant">
        Copy the JSON above, or open{" "}
        <Link
          href={`/api/admin/traces/${trace.id}`}
          className="text-primary hover:underline"
        >
          /api/admin/traces/{trace.id}
        </Link>{" "}
        while signed in as admin.
      </p>
    </div>
  );
}
