"use client";

import Link from "next/link";
import { useState } from "react";
import type { PROMPT_VERSIONS } from "@/lib/agent/evaluation";

type PromptVersion = (typeof PROMPT_VERSIONS)[number];

type ReplayResponse = {
  original: {
    id: string;
    status: string;
    mode: string;
    duration_ms: number | null;
    answer_preview: string | null;
    sources: string[];
  };
  replay: {
    trace_id?: string;
    prompt_version: string;
    mode: string;
    duration_ms: number;
    answer: string;
    sources: string[];
    retrieval: string;
    awaiting_plan: boolean;
  };
};

type ErrorPayload = { error?: string };

function isReplayResponse(
  value: ReplayResponse | ErrorPayload,
): value is ReplayResponse {
  return "original" in value && "replay" in value;
}

export function TraceReplayPanel({
  traceId,
  versions,
}: {
  traceId: string;
  versions: PromptVersion[];
}) {
  const [promptVersion, setPromptVersion] = useState<string>(
    versions[0]?.id || "",
  );
  const [mode, setMode] = useState("multi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplayResponse | null>(null);

  async function replay() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/traces/${traceId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptVersion, mode }),
      });
      const data = (await response.json()) as ReplayResponse | ErrorPayload;
      if (!response.ok || !isReplayResponse(data)) {
        setError("error" in data && data.error ? data.error : "Replay failed.");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h3 className="font-headline text-lg font-semibold text-primary">
            Trace replay / prompt version
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Re-run this question through a selected prompt profile and compare
            latency, retrieval, safety state, and source grounding.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[220px_160px_auto]">
          <label className="text-sm">
            <span className="text-on-surface-variant">Prompt version</span>
            <select
              value={promptVersion}
              onChange={(event) => setPromptVersion(event.target.value)}
              className="mt-1 w-full rounded-xl border border-outline-variant/35 bg-surface px-3 py-2 outline-none focus:border-primary"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-on-surface-variant">Mode</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-outline-variant/35 bg-surface px-3 py-2 outline-none focus:border-primary"
            >
              <option value="multi">multi</option>
              <option value="agent">agent</option>
              <option value="react">react</option>
              <option value="legacy">legacy</option>
              <option value="plan">plan</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={replay}
            className="self-end rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {busy ? "Replaying..." : "Replay"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Original
            </p>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                Status: <strong>{result.original.status}</strong>
              </p>
              <p>
                Mode: <strong>{result.original.mode}</strong>
              </p>
              <p>
                Duration:{" "}
                <strong>
                  {result.original.duration_ms != null
                    ? `${result.original.duration_ms}ms`
                    : "n/a"}
                </strong>
              </p>
              <p>Sources: {result.original.sources.length}</p>
            </div>
            {result.original.answer_preview ? (
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-on-surface-variant">
                {result.original.answer_preview}
              </p>
            ) : null}
          </article>

          <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Replay
            </p>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                Prompt: <strong>{result.replay.prompt_version}</strong>
              </p>
              <p>
                Mode: <strong>{result.replay.mode}</strong>
              </p>
              <p>
                Duration: <strong>{result.replay.duration_ms}ms</strong>
              </p>
              <p>
                Retrieval: <strong>{result.replay.retrieval}</strong> · Sources:{" "}
                {result.replay.sources.length}
              </p>
            </div>
            <p className="mt-3 line-clamp-5 text-sm leading-6 text-on-surface-variant">
              {result.replay.answer}
            </p>
            {result.replay.trace_id ? (
              <Link
                href={`/admin/traces/${result.replay.trace_id}`}
                className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                Open replay trace
              </Link>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
