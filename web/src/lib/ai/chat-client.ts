export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
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

export type AiChatDone = {
  kind?: "done";
  reply: string;
  sources: string[];
  mode: "agent" | "llm" | "rules";
  retrieval: "pgvector" | "keyword" | "none" | "mixed";
  thinking: ThinkingStep[];
  awaiting_plan?: boolean;
  plan?: AgentPlan;
};

export type AiChatPlanPending = {
  kind: "plan";
  reply: string;
  plan: AgentPlan;
  thinking: ThinkingStep[];
};

export type AiChatResult = AiChatDone | AiChatPlanPending;

type StreamEvent =
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
      payload: Omit<AiChatDone, "thinking" | "kind">;
    }
  | { type: "error"; error: string };

type StreamOptions = {
  mode?: "agent" | "react" | "legacy" | "plan" | "multi";
  planDecision?: "approve" | "decline";
  approvedPlan?: AgentPlan;
  history?: { role: "user" | "assistant"; content: string }[];
  sessionId?: string;
};

/**
 * Call /api/ai-chat with SSE. May return a pending plan (Approve/Decline).
 */
export async function streamAiChat(
  message: string,
  onThinking: (steps: ThinkingStep[]) => void,
  options?: StreamOptions,
): Promise<AiChatResult> {
  const response = await fetch("/api/ai-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      stream: true,
      ...(options?.mode ? { mode: options.mode } : {}),
      ...(options?.planDecision
        ? { planDecision: options.planDecision }
        : {}),
      ...(options?.approvedPlan
        ? { approvedPlan: options.approvedPlan }
        : {}),
      ...(options?.history?.length ? { history: options.history } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    }),
  });

  if (!response.ok) {
    let error = "Failed to get reply";
    try {
      const data = await response.json();
      error = data.error || error;
    } catch {
      /* ignore */
    }
    throw new Error(error);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (data.awaiting_plan && data.plan) {
      return {
        kind: "plan",
        reply: data.reply,
        plan: data.plan,
        thinking: data.thinking || [],
      };
    }
    return {
      kind: "done",
      reply: data.reply,
      sources: data.sources || [],
      mode: data.mode || "rules",
      retrieval: data.retrieval || "keyword",
      thinking: data.thinking || [],
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const thinking: ThinkingStep[] = [];
  let donePayload: Omit<AiChatDone, "thinking" | "kind"> | null = null;
  let livePlan: AgentPlan | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.replace(/^data:\s*/, "");
      let event: StreamEvent;
      try {
        event = JSON.parse(json) as StreamEvent;
      } catch {
        continue;
      }

      if (
        event.type === "thinking" ||
        event.type === "tool_start" ||
        event.type === "tool_end"
      ) {
        thinking.push(event.step);
        onThinking([...thinking]);
      } else if (event.type === "plan") {
        livePlan = event.plan;
        thinking.push(event.step);
        onThinking([...thinking]);
      } else if (event.type === "done") {
        donePayload = event.payload;
      } else if (event.type === "error") {
        throw new Error(event.error);
      }
    }
  }

  if (!donePayload) {
    throw new Error("Stream ended without a reply.");
  }

  const plan = donePayload.plan || livePlan || undefined;
  if (donePayload.awaiting_plan && plan) {
    return {
      kind: "plan",
      reply: donePayload.reply,
      plan,
      thinking,
    };
  }

  return { ...donePayload, kind: "done", thinking };
}
