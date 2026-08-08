import { AdminEvaluationRunner } from "@/components/AdminEvaluationRunner";
import {
  computeTraceQuality,
  evaluateStaticReadiness,
  PROMPT_VERSIONS,
  summarizeEvaluation,
} from "@/lib/agent/evaluation";
import { listTraces } from "@/lib/agent/observability/store";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationsPage() {
  const { rows, source, note } = await listTraces(80);
  const results = evaluateStaticReadiness(rows);
  const summary = summarizeEvaluation(results);
  const traceQuality = computeTraceQuality(rows);

  return (
    <div>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Agent quality
          </p>
          <h2 className="mt-2 font-headline text-3xl font-bold">
            Evaluation dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Safety gates, tool registry checks, trace health, prompt versions,
            and smoke tests for the SihatQ preventive-health agent.
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="font-headline text-lg font-semibold">Trace quality</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Traces", traceQuality.totalTraces, "Recent records analysed"],
              ["Success", `${traceQuality.successRate}%`, "Status ok"],
              [
                "Source coverage",
                `${traceQuality.sourceCoverage}%`,
                "Answers with sources",
              ],
              [
                "Tool coverage",
                `${traceQuality.toolStepCoverage}%`,
                "Runs with tool steps",
              ],
              [
                "Avg latency",
                `${traceQuality.averageLatencyMs}ms`,
                "Recorded duration",
              ],
              ["Blocked", traceQuality.blockedRuns, "Safety blocked runs"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-xl bg-surface-container p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {label}
                </p>
                <p className="mt-2 font-headline text-2xl font-bold text-primary">
                  {value}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="font-headline text-lg font-semibold">
            Prompt versions
          </h3>
          <div className="mt-4 space-y-3">
            {PROMPT_VERSIONS.map((version) => (
              <article
                key={version.id}
                className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{version.label}</p>
                  <code className="text-xs text-on-surface-variant">
                    {version.id}
                  </code>
                </div>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  {version.detail}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <AdminEvaluationRunner
          initial={{
            summary,
            results,
            trace_source: source,
            note,
          }}
        />
      </div>
    </div>
  );
}
