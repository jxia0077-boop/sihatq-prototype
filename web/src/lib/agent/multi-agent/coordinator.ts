import type {
  AgentEvent,
  AgentRunResult,
  RiskContext,
  ThinkingStep,
} from "@/lib/agent/types";
import type { MultiAgentBundle, WorkerResult } from "@/lib/agent/multi-agent/types";
import {
  buildCtx,
  runPersonalizationWorker,
  runResearchWorker,
  runSafetyEditor,
} from "@/lib/agent/multi-agent/workers";

const MULTI_RE =
  /\b(compare|comparison|contrast|and also|lifestyle|recommend|NHMS|DOSM|based on my|对比|并且|生活方式|建议)\b/i;

export function multiAgentEnabled() {
  const flag = (process.env.AGENT_MULTI_AGENT_ENABLED || "true").toLowerCase();
  return !(flag === "0" || flag === "false" || flag === "off");
}

/** Complex multi-intent questions benefit from parallel workers. */
export function shouldUseMultiAgent(
  question: string,
  forced?: string,
): boolean {
  if (!multiAgentEnabled()) return false;
  if (forced === "multi" || forced === "multi-agent") return true;
  if (forced === "react" || forced === "legacy") return false;

  const q = question.trim();
  if (q.length < 60) return false;
  const hits = (q.match(MULTI_RE) || []).length;
  if (hits >= 2) return true;
  if (/\bcompare\b/i.test(q) && /\b(risk|lifestyle|recommend|NHMS)\b/i.test(q)) {
    return true;
  }
  if (
    /对比/.test(q) &&
    /(风险|生活方式|建议|NHMS)/.test(q)
  ) {
    return true;
  }
  return false;
}

function mergeWorkerMarkdown(
  question: string,
  research: WorkerResult,
  personal: WorkerResult,
): string {
  const parts: string[] = [];
  parts.push(
    `Here is a combined preventive summary for: **${question.slice(0, 160)}**`,
  );
  parts.push("");

  if (personal.ok && personal.markdown) {
    parts.push(personal.markdown);
    parts.push("");
  } else if (!personal.ok) {
    parts.push(`_(Personalization worker unavailable: ${personal.error})_`);
    parts.push("");
  }

  if (research.ok && research.markdown) {
    parts.push(research.markdown);
    parts.push("");
  } else if (!research.ok) {
    parts.push(`_(Research worker unavailable: ${research.error})_`);
    parts.push("");
  }

  parts.push("### Practical takeaway");
  parts.push(
    "- Use public NHMS/DOSM figures as population context, not a personal diagnosis.",
  );
  parts.push(
    "- Discuss screening and lifestyle changes with a qualified clinician or clinic.",
  );
  parts.push(
    "- Small steps (less sugary drinks, regular walking) are useful starting points.",
  );

  return parts.join("\n");
}

/**
 * Coordinator: split → parallel workers (Result Objects) → merge → safety edit.
 * No Git Worktree — health domain uses isolated JSON result objects.
 */
export async function runMultiAgent(options: {
  question: string;
  userId: string;
  risk: RiskContext;
  onEvent?: (event: AgentEvent) => void | Promise<void>;
}): Promise<AgentRunResult> {
  const thinking: ThinkingStep[] = [];
  const emit = async (event: AgentEvent) => {
    if (
      event.type === "thinking" ||
      event.type === "tool_start" ||
      event.type === "tool_end"
    ) {
      thinking.push(event.step);
    }
    await options.onEvent?.(event);
  };

  await emit({
    type: "thinking",
    step: {
      id: "multi-start",
      label: "Coordinator: splitting into parallel workers…",
      detail: "research ∥ personalization → merge → safety (Result Objects)",
    },
  });

  const ctx = buildCtx(options.userId, options.risk);

  await emit({
    type: "thinking",
    step: {
      id: "worker-research-start",
      label: "Research Worker started…",
      detail: "stats + knowledge (isolated result object)",
    },
  });
  await emit({
    type: "thinking",
    step: {
      id: "worker-personal-start",
      label: "Personalization Worker started…",
      detail: "assessment + recommendations (isolated result object)",
    },
  });

  const parallelStarted = Date.now();
  const [research, personal] = await Promise.all([
    runResearchWorker({ question: options.question, ctx }),
    runPersonalizationWorker({ question: options.question, ctx }),
  ]);
  const parallelMs = Date.now() - parallelStarted;

  await emit({
    type: "thinking",
    step: {
      id: "worker-research-done",
      label: research.ok
        ? "Research Worker finished"
        : "Research Worker failed",
      detail: `${research.summary} (${research.finishedAt - research.startedAt}ms)`,
    },
  });
  await emit({
    type: "thinking",
    step: {
      id: "worker-personal-done",
      label: personal.ok
        ? "Personalization Worker finished"
        : "Personalization Worker failed",
      detail: `${personal.summary} (${personal.finishedAt - personal.startedAt}ms)`,
    },
  });
  await emit({
    type: "thinking",
    step: {
      id: "multi-parallel",
      label: "Parallel workers completed",
      detail: `wall-clock ~${parallelMs}ms (both ran via Promise.all)`,
    },
  });

  const draft = mergeWorkerMarkdown(options.question, research, personal);

  await emit({
    type: "thinking",
    step: {
      id: "multi-merge",
      label: "Coordinator merging Result Objects…",
      detail: "dedupe sources · single markdown answer",
    },
  });

  const safety = runSafetyEditor(draft);
  await emit({
    type: "thinking",
    step: {
      id: "worker-safety-done",
      label: "Safety Editor finished",
      detail: safety.summary,
    },
  });

  const sources = Array.from(
    new Set([...research.sources, ...personal.sources]),
  );

  const retrieval =
    research.retrieval && research.retrieval !== "none"
      ? research.retrieval
      : "none";

  const bundle: MultiAgentBundle = {
    results: [research, personal, safety],
    mergedMarkdown: safety.markdown,
    sources,
    parallelWorkers: ["research", "personalization"],
  };

  void bundle;

  return {
    answer: safety.markdown,
    sources,
    mode: "agent",
    retrieval,
    thinking,
  };
}
