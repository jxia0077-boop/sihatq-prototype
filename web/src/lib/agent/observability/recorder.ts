import { randomUUID } from "node:crypto";
import type { AgentEvent, AgentRunResult, LlmMeta } from "@/lib/agent/types";
import type {
  AgentTraceRecord,
  TraceStep,
} from "@/lib/agent/observability/types";
import { persistTrace } from "@/lib/agent/observability/store";

function nowIso() {
  return new Date().toISOString();
}

export class AgentTraceRecorder {
  readonly id: string;
  private readonly startedAt: number;
  private readonly record: AgentTraceRecord;

  constructor(options: {
    question: string;
    userId?: string;
    sessionId?: string;
    modeHint?: string;
  }) {
    this.id = randomUUID();
    this.startedAt = Date.now();
    this.record = {
      id: this.id,
      session_id: options.sessionId || null,
      user_id: options.userId || null,
      question: options.question.slice(0, 2000),
      mode: options.modeHint || "agent",
      status: "ok",
      started_at: nowIso(),
      ended_at: null,
      duration_ms: null,
      steps: [],
      answer_preview: null,
      sources: [],
      meta: {},
    };
  }

  addStep(step: Omit<TraceStep, "ts"> & { ts?: string }) {
    this.record.steps.push({
      ts: step.ts || nowIso(),
      ...step,
    });
  }

  recordLlm(meta: LlmMeta | undefined, kind: "message" | "tool_calls" | "error", detail?: string) {
    this.addStep({
      type: "llm",
      label: meta
        ? `LLM ${meta.protocol}/${meta.provider} · ${meta.model}`
        : "LLM call",
      detail,
      llmKind: kind,
      protocol: meta?.protocol,
      provider: meta?.provider,
      model: meta?.model,
      latencyMs: meta?.latencyMs,
      promptTokens: meta?.promptTokens,
      completionTokens: meta?.completionTokens,
      ok: kind !== "error",
    });
  }

  recordGate(options: {
    tool: string;
    allowed: boolean;
    reason?: string;
  }) {
    this.addStep({
      type: "gate",
      label: options.allowed
        ? `Gate allowed: ${options.tool}`
        : `Gate blocked: ${options.tool}`,
      tool: options.tool,
      allowed: options.allowed,
      reason: options.reason,
      ok: options.allowed,
    });
  }

  /** Mirror SSE agent events into the structured trace. */
  ingestEvent(event: AgentEvent) {
    if (event.type === "thinking") {
      const label = event.step.label || "";
      let type: TraceStep["type"] = "thinking";
      if (/skill/i.test(label)) type = "skill";
      else if (/memory/i.test(label)) type = "memory";
      else if (/plan|multi-agent|react|legacy|permission/i.test(label)) {
        type = "mode";
      }
      this.addStep({
        type,
        label: event.step.label,
        detail: event.step.detail,
      });
      return;
    }

    if (event.type === "tool_start") {
      this.addStep({
        type: "tool",
        label: event.step.label,
        detail: event.step.detail,
        tool: event.tool,
        argsSummary: event.step.detail,
      });
      return;
    }

    if (event.type === "tool_end") {
      this.addStep({
        type: "tool",
        label: event.step.label,
        detail: event.step.detail,
        tool: event.tool,
        ok: event.ok,
      });
      return;
    }

    if (event.type === "plan") {
      this.addStep({
        type: "mode",
        label: event.step.label,
        detail: `plan steps=${event.plan.steps.length}`,
      });
      return;
    }

    if (event.type === "error") {
      this.addStep({
        type: "error",
        label: "Agent error",
        detail: event.error,
        ok: false,
      });
    }
  }

  async finish(result: AgentRunResult): Promise<AgentTraceRecord> {
    this.record.ended_at = nowIso();
    this.record.duration_ms = Date.now() - this.startedAt;
    this.record.mode = result.awaitingPlan
      ? "plan"
      : result.mode === "agent"
        ? this.record.mode || "agent"
        : result.mode;
    this.record.status = result.awaitingPlan
      ? "awaiting_plan"
      : /could not complete|Stopped by|medical safety/i.test(result.answer)
        ? "blocked"
        : "ok";
    this.record.answer_preview = result.answer.slice(0, 500);
    this.record.sources = result.sources.slice(0, 20);
    this.record.meta = {
      retrieval: result.retrieval,
      thinking_count: result.thinking.length,
      awaiting_plan: Boolean(result.awaitingPlan),
    };

    await persistTrace(this.record);
    return this.record;
  }

  snapshot(): AgentTraceRecord {
    return structuredClone(this.record);
  }
}

export function createTraceRecorder(options: {
  question: string;
  userId?: string;
  sessionId?: string;
  modeHint?: string;
}): AgentTraceRecorder | null {
  const flag = (process.env.AGENT_TRACE_ENABLED || "true").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return null;
  return new AgentTraceRecorder(options);
}
