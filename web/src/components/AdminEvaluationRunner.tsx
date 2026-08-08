"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  EvaluationCaseResult,
  EvaluationSummary,
} from "@/lib/agent/evaluation";

type EvaluationPayload = {
  summary: EvaluationSummary;
  results: EvaluationCaseResult[];
  trace_source: "db" | "memory" | "mixed";
  note?: string;
};

type ErrorPayload = { error?: string };

function isEvaluationPayload(
  value: EvaluationPayload | ErrorPayload,
): value is EvaluationPayload {
  return "summary" in value && "results" in value;
}

function statusClass(status: EvaluationCaseResult["status"]) {
  if (status === "pass") return "bg-primary/10 text-primary";
  if (status === "warn") {
    return "bg-secondary-container text-on-secondary-container";
  }
  return "bg-error-container text-on-error-container";
}

export function AdminEvaluationRunner({
  initial,
}: {
  initial: EvaluationPayload;
}) {
  const [payload, setPayload] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runSuite() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/evaluations", {
        method: "POST",
      });
      const data = (await response.json()) as EvaluationPayload | ErrorPayload;
      if (!response.ok || !isEvaluationPayload(data)) {
        setMessage(
          "error" in data && data.error ? data.error : "Evaluation failed.",
        );
        return;
      }
      setPayload(data);
      setMessage("Smoke suite finished and wrote fresh traces.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not run evaluation.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pass rate", `${payload.summary.passRate}%`, "Across eval checks"],
          ["Passed", payload.summary.pass, "Expected behavior"],
          ["Warnings", payload.summary.warn, "Needs more trace data"],
          ["Failures", payload.summary.fail, "Review before demo"],
        ].map(([label, value, detail]) => (
          <article
            key={label}
            className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 shadow-sm"
          >
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className="mt-2 font-headline text-3xl font-bold text-primary">
              {value}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="font-headline text-lg font-semibold text-primary">
              Smoke evaluation
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Runs safety, multi-agent, and plan-mode probes through the real
              SihatQ Agent runtime. Results are written into trace storage.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={runSuite}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">
              science
            </span>
            {busy ? "Running..." : "Run smoke suite"}
          </button>
        </div>
        {message ? (
          <p className="mt-3 text-sm text-on-surface-variant">{message}</p>
        ) : null}
        {payload.note ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            Trace source: <code>{payload.trace_source}</code> · {payload.note}
          </p>
        ) : (
          <p className="mt-3 text-sm text-on-surface-variant">
            Trace source: <code>{payload.trace_source}</code>
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/20 px-5 py-4">
          <h3 className="font-headline text-lg font-semibold">
            Evaluation checks
          </h3>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {payload.results.map((item) => (
            <article key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                      {item.area}
                    </span>
                  </div>
                  <h4 className="mt-2 font-semibold">{item.title}</h4>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">
                    {item.detail}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-on-surface-variant">
                  {item.latencyMs != null ? <span>{item.latencyMs}ms</span> : null}
                  {item.traceId ? (
                    <Link
                      href={`/admin/traces/${item.traceId}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      View trace
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
