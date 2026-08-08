import type { LlmMeta } from "@/lib/agent/types";

export type TraceStepType =
  | "run"
  | "llm"
  | "tool"
  | "gate"
  | "mode"
  | "memory"
  | "skill"
  | "error"
  | "thinking";

export type TraceStep = {
  ts: string;
  type: TraceStepType;
  label?: string;
  detail?: string;
  tool?: string;
  ok?: boolean;
  allowed?: boolean;
  reason?: string;
  protocol?: LlmMeta["protocol"];
  provider?: string;
  model?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  llmKind?: "message" | "tool_calls" | "error";
  argsSummary?: string;
};

export type AgentTraceRecord = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  question: string;
  mode: string;
  status: "ok" | "error" | "blocked" | "awaiting_plan";
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  steps: TraceStep[];
  answer_preview: string | null;
  sources: string[];
  meta: Record<string, unknown>;
};
