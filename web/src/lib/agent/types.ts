export type RiskContext = {
  risk_category?: string;
  risk_level?: string;
  explanation?: string;
  comparison_text?: string;
  recommendations?: { title: string; description: string }[];
} | null;

export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
};

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ChatMessage = {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolParameterSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
};

export type ToolResult = {
  ok: boolean;
  summary: string;
  data: unknown;
  sources?: string[];
  retrieval?: "pgvector" | "keyword";
};

export type AgentPlanStep = {
  id: string;
  tool?: string;
  action?: "answer";
  args?: Record<string, unknown>;
  reason: string;
};

export type AgentPlan = {
  goal: string;
  steps: AgentPlanStep[];
  risks: string[];
};

export type AgentEvent =
  | { type: "thinking"; step: ThinkingStep }
  | {
      type: "tool_start";
      step: ThinkingStep;
      tool: string;
      args?: Record<string, unknown>;
    }
  | {
      type: "tool_end";
      step: ThinkingStep;
      tool: string;
      ok: boolean;
    }
  | { type: "plan"; plan: AgentPlan; step: ThinkingStep }
  | {
      type: "done";
      payload: {
        reply: string;
        sources: string[];
        mode: "agent" | "llm" | "rules";
        retrieval: "pgvector" | "keyword" | "none" | "mixed";
        awaiting_plan?: boolean;
        plan?: AgentPlan;
        trace_id?: string;
      };
    }
  | { type: "error"; error: string };

export type AgentRunResult = {
  answer: string;
  sources: string[];
  mode: "agent" | "llm" | "rules";
  retrieval: "pgvector" | "keyword" | "none" | "mixed";
  thinking: ThinkingStep[];
  awaitingPlan?: boolean;
  plan?: AgentPlan;
  /** Structured observability id (P5). */
  traceId?: string;
};

export type LlmProtocol = "openai" | "anthropic" | "gemini";

export type LlmMeta = {
  protocol: LlmProtocol;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
};

export type LlmToolResponse =
  | {
      kind: "tool_calls";
      toolCalls: ToolCall[];
      content?: string | null;
      meta?: LlmMeta;
    }
  | { kind: "message"; content: string; meta?: LlmMeta }
  | { kind: "error"; error: string; meta?: LlmMeta };

export type ToolHandlerContext = {
  userId: string;
  risk: RiskContext;
};
