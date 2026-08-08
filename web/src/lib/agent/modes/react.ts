import {
  buildDiscoverStubDefinitions,
  loadFullToolSchema,
  measureDiscoverVsFull,
} from "@/lib/agent/mcp/registry";
import { chatWithTools } from "@/lib/agent/llm/provider";
import {
  compressMessages,
  estimateTokens,
} from "@/lib/agent/memory/compress";
import { getActiveTrace } from "@/lib/agent/observability/context";
import { AgentSafetyError, gateToolCall } from "@/lib/agent/safety/gate";
import {
  checkAssistantMedicalRules,
  MEDICAL_SAFETY_REPLY,
} from "@/lib/agent/safety/medical-rules";
import {
  getPermissionMode,
  type PermissionMode,
} from "@/lib/agent/safety/permissions";
import { routeSkill, type SkillPack } from "@/lib/agent/skills/catalog";
import { executeTool } from "@/lib/agent/tools/definitions";
import type {
  AgentEvent,
  AgentRunResult,
  ChatMessage,
  RiskContext,
  ThinkingStep,
  ToolDefinition,
  ToolHandlerContext,
} from "@/lib/agent/types";

const SYSTEM_PROMPT = `You are SihatQ AI Assistant for Malaysia preventive health education.

Rules:
- Use only the tools exposed for the active skill (MCP discovery stubs; full schemas load on call).
- Never diagnose disease, prescribe medicine, or invent lab values.
- Only use tool results and the user question; do not invent NHMS/DOSM numbers.
- Always remind users this is preventive information, not medical advice.
- Keep answers concise, friendly, and practical.
- Prefer English unless the user writes Chinese — unless memories say otherwise.
- When you have enough information, respond with the final answer in plain text (no tool call).`;

function maxSteps() {
  const raw = Number(process.env.AGENT_MAX_STEPS || "8");
  if (!Number.isFinite(raw)) return 8;
  return Math.min(12, Math.max(2, Math.floor(raw)));
}

function mergeRetrieval(
  current: AgentRunResult["retrieval"],
  next?: "pgvector" | "keyword",
): AgentRunResult["retrieval"] {
  if (!next) return current;
  if (current === "none") return next;
  if (current === next) return current;
  return "mixed";
}

function finalizeAnswer(text: string): string {
  if (checkAssistantMedicalRules(text)) {
    return MEDICAL_SAFETY_REPLY;
  }
  return ensureDisclaimer(text);
}

function skillsEnabled() {
  const flag = (process.env.AGENT_SKILLS_ENABLED || "true").toLowerCase();
  return !(flag === "0" || flag === "false" || flag === "off");
}

function mcpLazyEnabled() {
  const flag = (process.env.AGENT_MCP_LAZY_LOAD || "true").toLowerCase();
  return !(flag === "0" || flag === "false" || flag === "off");
}

export async function runReactAgent(options: {
  question: string;
  userId: string;
  risk: RiskContext;
  permissionMode?: PermissionMode;
  history?: { role: "user" | "assistant"; content: string }[];
  memoryBlock?: string;
  skill?: SkillPack;
  onEvent?: (event: AgentEvent) => void | Promise<void>;
}): Promise<AgentRunResult> {
  const permissionMode = options.permissionMode || getPermissionMode();
  const skill =
    options.skill ||
    (skillsEnabled() ? routeSkill(options.question) : routeSkill(""));
  const allowed = new Set(skill.tools);
  const thinking: ThinkingStep[] = [];
  const sources = new Set<string>();
  let retrieval: AgentRunResult["retrieval"] = "none";
  const loadedFull = new Map<string, ToolDefinition>();

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

  const metrics = measureDiscoverVsFull([...allowed]);
  await emit({
    type: "thinking",
    step: {
      id: "agent-start",
      label: "Starting SihatQ agent…",
      detail: `ReAct · permission=${permissionMode}`,
    },
  });

  await emit({
    type: "thinking",
    step: {
      id: "skill-selected",
      label: `Skill: ${skill.title}`,
      detail: `tools=[${skill.tools.join(", ")}]`,
    },
  });

  if (mcpLazyEnabled()) {
    await emit({
      type: "thinking",
      step: {
        id: "mcp-discover",
        label: "MCP discovery (short tool cards)…",
        detail: `stubs ~${metrics.stubChars} chars vs full ~${metrics.fullChars} chars (−${Math.round(metrics.savedRatio * 100)}% tool JSON)`,
      },
    });
  }

  const systemParts = [SYSTEM_PROMPT, skill.systemAppendix];
  if (options.memoryBlock) {
    systemParts.push(options.memoryBlock);
    await emit({
      type: "thinking",
      step: {
        id: "memory-loaded",
        label: "Loaded long-term memories…",
      },
    });
  }

  let messages: ChatMessage[] = [
    { role: "system", content: systemParts.join("\n\n") },
  ];

  for (const turn of options.history || []) {
    if (!turn.content?.trim()) continue;
    messages.push({
      role: turn.role,
      content: turn.content.slice(0, 2000),
    });
  }

  messages.push({
    role: "user",
    content: options.risk?.risk_category
      ? `${options.question}\n\n(Note: user has a saved assessment; use get_user_risk if needed.)`
      : `${options.question}\n\n(Note: user may not have an assessment yet.)`,
  });

  const toolCtx: ToolHandlerContext = {
    userId: options.userId,
    risk: options.risk,
  };

  const stubDefs = mcpLazyEnabled()
    ? buildDiscoverStubDefinitions([...allowed])
    : [...allowed]
        .map((name) => loadFullToolSchema(name))
        .filter(Boolean) as ToolDefinition[];

  const limit = maxSteps();
  const toolNotes: string[] = [];

  for (let step = 1; step <= limit; step += 1) {
    const compressed = compressMessages(messages);
    if (compressed.compressed) {
      messages = compressed.messages;
      await emit({
        type: "thinking",
        step: {
          id: `compress-${step}`,
          label: "Compressed conversation context…",
          detail: `~${estimateTokens(messages)} tokens after trim/summary (tool pairs kept intact)`,
        },
      });
    }

    await emit({
      type: "thinking",
      step: {
        id: `llm-${step}`,
        label: `Reasoning (step ${step}/${limit})…`,
      },
    });

    // Prefer stubs for discovery; once a tool was fully loaded, swap that one to full schema
    const defsForLlm = stubDefs.map((stub) => loadedFull.get(stub.name) || stub);

    const llm = await chatWithTools(messages, defsForLlm);

    if (llm.kind === "error") {
      if (toolNotes.length > 0) {
        await emit({
          type: "thinking",
          step: {
            id: "agent-compose-fallback",
            label: "Model busy — composing from tool results…",
            detail: llm.error,
          },
        });
        return {
          answer: finalizeAnswer(
            composeFromToolNotes(options.question, toolNotes),
          ),
          sources: Array.from(sources),
          mode: "agent",
          retrieval,
          thinking,
        };
      }
      throw new Error(llm.error);
    }

    if (llm.kind === "message") {
      const meta = llm.meta;
      await emit({
        type: "thinking",
        step: {
          id: "agent-done",
          label: "Finishing answer…",
          detail: meta
            ? `${meta.protocol}/${meta.provider} · ${meta.latencyMs}ms · preventive only`
            : "Preventive guidance only — not a medical diagnosis.",
        },
      });
      return {
        answer: finalizeAnswer(llm.content),
        sources: Array.from(sources),
        mode: "agent",
        retrieval,
        thinking,
      };
    }

    messages.push({
      role: "assistant",
      content: llm.content ?? null,
      tool_calls: llm.toolCalls,
    });

    for (const call of llm.toolCalls) {
      const full = loadFullToolSchema(call.name);
      if (!full || !allowed.has(call.name)) {
        const message = `Tool "${call.name}" is not available for skill ${skill.id}.`;
        await emit({
          type: "tool_end",
          tool: call.name,
          ok: false,
          step: {
            id: `tool-reject-${call.id}`,
            label: `Blocked tool: ${call.name}`,
            detail: message,
          },
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify({ ok: false, error: message }),
        });
        continue;
      }

      // Phase 3 — full schema load at call time
      if (!loadedFull.has(call.name)) {
        loadedFull.set(call.name, full);
        await emit({
          type: "thinking",
          step: {
            id: `mcp-full-${call.name}-${call.id}`,
            label: `MCP full schema loaded: ${call.name}`,
            detail: `server schema chars≈${JSON.stringify(full.parameters).length}`,
          },
        });
      }

      let args: Record<string, unknown>;
      try {
        args = gateToolCall(call, [full], permissionMode, allowed);
        getActiveTrace()?.recordGate({
          tool: call.name,
          allowed: true,
        });
      } catch (error) {
        const message =
          error instanceof AgentSafetyError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Tool rejected by safety gate.";

        getActiveTrace()?.recordGate({
          tool: call.name,
          allowed: false,
          reason: message,
        });

        // Soft fail with schema so the model can retry (lazy-load UX)
        await emit({
          type: "tool_end",
          tool: call.name,
          ok: false,
          step: {
            id: `tool-reject-${call.id}`,
            label: `Need better args for ${call.name}`,
            detail: message,
          },
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify({
            ok: false,
            error: message,
            full_schema: full,
            hint: "Retry this tool with arguments matching full_schema.",
          }),
        });
        continue;
      }

      await emit({
        type: "tool_start",
        tool: call.name,
        args,
        step: {
          id: `tool-start-${call.id}`,
          label: `Calling ${call.name}…`,
          detail: summarizeArgs(call.name, args),
        },
      });

      const result = await executeTool(call.name, args, toolCtx);
      retrieval = mergeRetrieval(retrieval, result.retrieval);
      for (const source of result.sources || []) sources.add(source);
      toolNotes.push(
        `${call.name}: ${result.summary}\n${JSON.stringify(result.data).slice(0, 1200)}`,
      );

      await emit({
        type: "tool_end",
        tool: call.name,
        ok: result.ok,
        step: {
          id: `tool-end-${call.id}`,
          label: result.ok
            ? `Got results from ${call.name}`
            : `${call.name} failed`,
          detail: result.summary,
        },
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify({
          ok: result.ok,
          summary: result.summary,
          data: result.data,
        }),
      });
    }
  }

  if (toolNotes.length > 0) {
    return {
      answer: finalizeAnswer(composeFromToolNotes(options.question, toolNotes)),
      sources: Array.from(sources),
      mode: "agent",
      retrieval,
      thinking,
    };
  }

  throw new Error(`Agent exceeded max steps (${limit}).`);
}

function composeFromToolNotes(question: string, notes: string[]): string {
  return [
    `Here is a preventive summary based on SihatQ tools for your question: "${question}"`,
    "",
    ...notes.map((n) => `• ${n}`),
    "",
    "Please treat this as education only and talk to a qualified clinician for personal medical decisions.",
  ].join("\n");
}

function summarizeArgs(
  name: string,
  args: Record<string, unknown>,
): string | undefined {
  if (name === "search_knowledge" && typeof args.query === "string") {
    return `query: ${args.query}`;
  }
  if (name === "get_reference_stat" && typeof args.indicator === "string") {
    return args.state
      ? `indicator: ${args.indicator}; state: ${args.state}`
      : `indicator: ${args.indicator}`;
  }
  return undefined;
}

function ensureDisclaimer(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("not a medical") ||
    lower.includes("not medical advice") ||
    (lower.includes("preventive") && lower.includes("diagnosis"))
  ) {
    return text.trim();
  }
  return `${text.trim()}\n\nSafety reminder: this is preventive information only — not a medical diagnosis. Please consult a qualified doctor or clinic for medical concerns.`;
}
