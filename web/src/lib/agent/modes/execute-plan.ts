import { loadFullToolSchema } from "@/lib/agent/mcp/registry";
import { chatWithTools } from "@/lib/agent/llm/provider";
import { AgentSafetyError, gateToolCall } from "@/lib/agent/safety/gate";
import {
  checkAssistantMedicalRules,
  MEDICAL_SAFETY_REPLY,
} from "@/lib/agent/safety/medical-rules";
import {
  getPermissionMode,
  type PermissionMode,
} from "@/lib/agent/safety/permissions";
import { routeSkill } from "@/lib/agent/skills/catalog";
import { executeTool } from "@/lib/agent/tools/definitions";
import type {
  AgentEvent,
  AgentPlan,
  AgentRunResult,
  ChatMessage,
  RiskContext,
  ThinkingStep,
  ToolHandlerContext,
} from "@/lib/agent/types";

const FINAL_SYSTEM = `You are SihatQ AI Assistant for Malaysia preventive health education.
Use ONLY the tool results below. Never diagnose, prescribe, or invent statistics.
Keep the answer concise. Prefer English unless the user wrote Chinese.
Always remind: preventive information only — not medical advice.`;

/**
 * Execute an approved plan's tool steps in order, then compose a final answer.
 * No tools run unless this function is called (Decline path never reaches here).
 */
export async function executeApprovedPlan(options: {
  question: string;
  userId: string;
  risk: RiskContext;
  plan: AgentPlan;
  permissionMode?: PermissionMode;
  memoryBlock?: string;
  onEvent?: (event: AgentEvent) => void | Promise<void>;
}): Promise<AgentRunResult> {
  const permissionMode = options.permissionMode || getPermissionMode();
  const skill = routeSkill(options.question);
  const allowed = new Set(skill.tools);
  const thinking: ThinkingStep[] = [];
  const sources = new Set<string>();
  let retrieval: AgentRunResult["retrieval"] = "none";
  const toolNotes: string[] = [];

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
      id: "plan-exec-start",
      label: "Executing approved plan…",
      detail: `${options.plan.goal} · skill=${skill.id}`,
    },
  });

  const toolCtx: ToolHandlerContext = {
    userId: options.userId,
    risk: options.risk,
  };

  for (const step of options.plan.steps) {
    if (step.action === "answer" || !step.tool) continue;
    if (!allowed.has(step.tool)) {
      await emit({
        type: "tool_end",
        tool: step.tool,
        ok: false,
        step: {
          id: `tool-skip-${step.id}`,
          label: `Skipped ${step.tool} (not in skill ${skill.id})`,
        },
      });
      continue;
    }

    const full = loadFullToolSchema(step.tool);
    if (!full) continue;

    await emit({
      type: "thinking",
      step: {
        id: `mcp-full-plan-${step.tool}`,
        label: `MCP full schema loaded: ${step.tool}`,
      },
    });

    const call = {
      id: `plan_${step.id}_${step.tool}`,
      name: step.tool,
      arguments: JSON.stringify(step.args || {}),
    };

    let args: Record<string, unknown>;
    try {
      args = gateToolCall(call, [full], permissionMode, allowed);
    } catch (error) {
      const message =
        error instanceof AgentSafetyError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Tool rejected.";
      throw new AgentSafetyError(message);
    }

    await emit({
      type: "tool_start",
      tool: step.tool,
      args,
      step: {
        id: `tool-start-${call.id}`,
        label: `Calling ${step.tool}…`,
        detail: step.reason,
      },
    });

    const result = await executeTool(step.tool, args, toolCtx);
    if (result.retrieval) {
      retrieval =
        retrieval === "none"
          ? result.retrieval
          : retrieval === result.retrieval
            ? retrieval
            : "mixed";
    }
    for (const s of result.sources || []) sources.add(s);
    toolNotes.push(
      `${step.tool}: ${result.summary}\n${JSON.stringify(result.data).slice(0, 1200)}`,
    );

    await emit({
      type: "tool_end",
      tool: step.tool,
      ok: result.ok,
      step: {
        id: `tool-end-${call.id}`,
        label: result.ok
          ? `Got results from ${step.tool}`
          : `${step.tool} failed`,
        detail: result.summary,
      },
    });
  }

  await emit({
    type: "thinking",
    step: {
      id: "plan-compose",
      label: "Drafting answer from plan results…",
    },
  });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [FINAL_SYSTEM, skill.systemAppendix, options.memoryBlock || ""]
        .filter(Boolean)
        .join("\n\n"),
    },
    {
      role: "user",
      content: [
        `User question: ${options.question}`,
        `Approved plan goal: ${options.plan.goal}`,
        "Tool results:",
        ...toolNotes,
        "Write the final educational answer now.",
      ].join("\n\n"),
    },
  ];

  const llm = await chatWithTools(messages, []);
  let answer =
    llm.kind === "message"
      ? llm.content
      : [
          `Here is a preventive summary for: "${options.question}"`,
          "",
          ...toolNotes.map((n) => `• ${n}`),
          "",
          "Please consult a qualified clinician for personal medical decisions.",
        ].join("\n");

  if (checkAssistantMedicalRules(answer)) {
    await emit({
      type: "thinking",
      step: {
        id: "medical-output-block",
        label: "Blocked unsafe wording in draft answer",
        detail: "Replaced with fixed safety reply",
      },
    });
    answer = MEDICAL_SAFETY_REPLY;
  } else {
    answer = ensureDisclaimer(answer);
  }

  return {
    answer,
    sources: Array.from(sources),
    mode: "agent",
    retrieval,
    thinking,
  };
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
