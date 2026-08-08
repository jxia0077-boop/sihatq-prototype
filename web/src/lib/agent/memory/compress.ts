import type { ChatMessage } from "@/lib/agent/types";

/** Approximate token count without tiktoken (chars/4). */
export function estimateTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    chars += (m.content || "").length;
    chars += (m.name || "").length;
    chars += (m.tool_call_id || "").length;
    for (const tc of m.tool_calls || []) {
      chars += tc.name.length + tc.arguments.length + tc.id.length;
    }
  }
  return Math.ceil(chars / 4) + messages.length * 4;
}

export function getContextTokenLimit() {
  const raw = Number(process.env.AGENT_CONTEXT_TOKEN_LIMIT || "120000");
  if (!Number.isFinite(raw) || raw < 2000) return 120000;
  return Math.floor(raw);
}

export function getCompressTriggerRatio() {
  const raw = Number(process.env.AGENT_COMPRESS_TRIGGER_RATIO || "0.75");
  if (!Number.isFinite(raw) || raw <= 0 || raw > 1) return 0.75;
  return raw;
}

type MessageUnit =
  | { kind: "single"; messages: ChatMessage[] }
  | { kind: "tool_chain"; messages: ChatMessage[]; tools: string[] };

/**
 * Group messages so assistant tool_calls + following tool results stay together.
 */
export function groupMessageUnits(messages: ChatMessage[]): MessageUnit[] {
  const units: MessageUnit[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "assistant" && m.tool_calls?.length) {
      const chain: ChatMessage[] = [m];
      const tools = m.tool_calls.map((t) => t.name);
      const needed = new Set(m.tool_calls.map((t) => t.id));
      i += 1;
      while (i < messages.length && needed.size > 0) {
        const next = messages[i];
        if (next.role === "tool" && next.tool_call_id && needed.has(next.tool_call_id)) {
          chain.push(next);
          needed.delete(next.tool_call_id);
          i += 1;
          continue;
        }
        // Incomplete chain — still keep what we have together
        break;
      }
      units.push({ kind: "tool_chain", messages: chain, tools });
      continue;
    }
    units.push({ kind: "single", messages: [m] });
    i += 1;
  }
  return units;
}

/**
 * Progressive compression: keep system + recent units; summarize dropped head.
 * Never splits a tool_call / tool_result pair.
 */
export function compressMessages(
  messages: ChatMessage[],
  options?: {
    tokenLimit?: number;
    triggerRatio?: number;
    keepRecentUnits?: number;
  },
): { messages: ChatMessage[]; compressed: boolean; summary?: string } {
  const tokenLimit = options?.tokenLimit ?? getContextTokenLimit();
  const triggerRatio = options?.triggerRatio ?? getCompressTriggerRatio();
  const keepRecent = options?.keepRecentUnits ?? 8;
  const trigger = Math.floor(tokenLimit * triggerRatio);

  if (estimateTokens(messages) <= trigger) {
    return { messages, compressed: false };
  }

  const units = groupMessageUnits(messages);
  const systemUnits = units.filter(
    (u) => u.kind === "single" && u.messages[0]?.role === "system",
  );
  const otherUnits = units.filter(
    (u) => !(u.kind === "single" && u.messages[0]?.role === "system"),
  );

  if (otherUnits.length <= keepRecent) {
    // Still over budget: drop oldest non-system singles only, never break chains
    return aggressiveTrim(systemUnits, otherUnits, trigger);
  }

  const head = otherUnits.slice(0, Math.max(0, otherUnits.length - keepRecent));
  const tail = otherUnits.slice(Math.max(0, otherUnits.length - keepRecent));
  const summary = summarizeUnits(head);

  const rebuilt: ChatMessage[] = [
    ...systemUnits.flatMap((u) => u.messages),
    {
      role: "system",
      content: `Conversation summary (compressed; tool pairs preserved where kept):\n${summary}`,
    },
    ...tail.flatMap((u) => u.messages),
  ];

  if (estimateTokens(rebuilt) > trigger) {
    return aggressiveTrim(systemUnits, [
      {
        kind: "single",
        messages: [
          {
            role: "system",
            content: `Conversation summary (compressed):\n${summary}`,
          },
        ],
      },
      ...tail,
    ], trigger);
  }

  return { messages: rebuilt, compressed: true, summary };
}

function aggressiveTrim(
  systemUnits: MessageUnit[],
  otherUnits: MessageUnit[],
  trigger: number,
): { messages: ChatMessage[]; compressed: boolean; summary?: string } {
  const working = [...otherUnits];
  const droppedTools: string[] = [];
  while (working.length > 1) {
    const candidate = [
      ...systemUnits.flatMap((u) => u.messages),
      ...working.flatMap((u) => u.messages),
    ];
    if (estimateTokens(candidate) <= trigger) break;
    const removed = working.shift();
    if (removed?.kind === "tool_chain") {
      droppedTools.push(...removed.tools);
    }
  }

  const summaryBits = [
    droppedTools.length
      ? `Earlier tools used (details dropped): ${[...new Set(droppedTools)].join(", ")}`
      : "Older turns trimmed to fit context.",
  ];

  const messages: ChatMessage[] = [
    ...systemUnits.flatMap((u) => u.messages),
    {
      role: "system",
      content: `Conversation summary (compressed):\n${summaryBits.join("\n")}`,
    },
    ...working.flatMap((u) => u.messages),
  ];

  return { messages, compressed: true, summary: summaryBits.join("\n") };
}

function summarizeUnits(units: MessageUnit[]): string {
  const lines: string[] = [];
  const tools = new Set<string>();

  for (const unit of units) {
    if (unit.kind === "tool_chain") {
      for (const t of unit.tools) tools.add(t);
      lines.push(
        `Tool chain: ${unit.tools.join(", ")} (results omitted in summary).`,
      );
      continue;
    }
    const m = unit.messages[0];
    if (!m) continue;
    if (m.role === "user") {
      lines.push(`User: ${(m.content || "").slice(0, 160)}`);
    } else if (m.role === "assistant") {
      lines.push(`Assistant: ${(m.content || "").slice(0, 160)}`);
    }
  }

  if (tools.size) {
    lines.unshift(
      `Tools used in compressed segment: ${[...tools].join(", ")}`,
    );
  }

  return lines.slice(0, 24).join("\n");
}

/** Validate invariant: every tool_call id has a matching tool result in the list. */
export function toolPairsIntact(messages: ChatMessage[]): boolean {
  const pending = new Set<string>();
  for (const m of messages) {
    if (m.role === "assistant" && m.tool_calls?.length) {
      for (const tc of m.tool_calls) pending.add(tc.id);
    }
    if (m.role === "tool" && m.tool_call_id) {
      pending.delete(m.tool_call_id);
    }
  }
  return pending.size === 0;
}
