import { answerWithLightRag } from "@/lib/ai/rag";
import { hasAgentLlm } from "@/lib/agent/llm/provider";
import { extractAndSaveMemories } from "@/lib/agent/memory/extract";
import {
  formatMemoriesForPrompt,
  loadMemories,
  memoryEnabled,
} from "@/lib/agent/memory/store";
import { executeApprovedPlan } from "@/lib/agent/modes/execute-plan";
import { draftHeuristicPlan, shouldUsePlanMode } from "@/lib/agent/modes/plan";
import {
  runMultiAgent,
  shouldUseMultiAgent,
} from "@/lib/agent/multi-agent/coordinator";
import { routeSkill } from "@/lib/agent/skills/catalog";
import { runReactAgent } from "@/lib/agent/modes/react";
import { runWithTrace } from "@/lib/agent/observability/context";
import { createTraceRecorder } from "@/lib/agent/observability/recorder";
import { AgentSafetyError } from "@/lib/agent/safety/gate";
import {
  checkUserMedicalRules,
  MEDICAL_SAFETY_REPLY,
} from "@/lib/agent/safety/medical-rules";
import { getPermissionMode } from "@/lib/agent/safety/permissions";
import type {
  AgentEvent,
  AgentPlan,
  AgentRunResult,
  RiskContext,
} from "@/lib/agent/types";

function agentEnabled() {
  const flag = (process.env.AGENT_ENABLED || "true").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}

export type HistoryTurn = { role: "user" | "assistant"; content: string };

/**
 * P4–P5 entry: multi-agent + dual protocol + structured traces.
 */
export async function runSihatqAgent(options: {
  question: string;
  userId: string;
  risk: RiskContext;
  mode?: "agent" | "legacy" | "react" | "plan" | "multi";
  planDecision?: "approve" | "decline";
  approvedPlan?: AgentPlan;
  history?: HistoryTurn[];
  sessionId?: string;
  onEvent?: (event: AgentEvent) => void | Promise<void>;
}): Promise<AgentRunResult> {
  const recorder = createTraceRecorder({
    question: options.question,
    userId: options.userId,
    sessionId: options.sessionId,
    modeHint: options.mode || "agent",
  });

  const run = () => runSihatqAgentInner(options, recorder);

  if (!recorder) return run();
  return runWithTrace(recorder, run);
}

async function runSihatqAgentInner(
  options: {
    question: string;
    userId: string;
    risk: RiskContext;
    mode?: "agent" | "legacy" | "react" | "plan" | "multi";
    planDecision?: "approve" | "decline";
    approvedPlan?: AgentPlan;
    history?: HistoryTurn[];
    sessionId?: string;
    onEvent?: (event: AgentEvent) => void | Promise<void>;
  },
  recorder: ReturnType<typeof createTraceRecorder>,
): Promise<AgentRunResult> {
  const onEvent = async (event: AgentEvent) => {
    recorder?.ingestEvent(event);
    await options.onEvent?.(event);
  };

  const attachTrace = async (result: AgentRunResult): Promise<AgentRunResult> => {
    if (!recorder) return result;
    await recorder.finish(result);
    return { ...result, traceId: recorder.id };
  };

  const permissionMode = getPermissionMode();
  const skill = routeSkill(options.question);

  recorder?.addStep({
    type: "run",
    label: "Agent run started",
    detail: `permission=${permissionMode}; skill=${skill.id}`,
  });

  const inputHit = checkUserMedicalRules(options.question);
  if (inputHit) {
    const step = {
      id: "medical-input-block",
      label: "Stopped by medical safety rules",
      detail: inputHit.reason,
    };
    await onEvent({ type: "thinking", step });
    recorder?.recordGate({
      tool: "user_input",
      allowed: false,
      reason: inputHit.reason,
    });
    return attachTrace({
      answer: MEDICAL_SAFETY_REPLY,
      sources: [],
      mode: "agent",
      retrieval: "none",
      thinking: [step],
    });
  }

  if (options.planDecision === "decline") {
    const step = {
      id: "plan-declined",
      label: "Plan declined — no tools ran",
    };
    await onEvent({ type: "thinking", step });
    return attachTrace({
      answer:
        "Okay — I cancelled that plan and did not run any tools. Ask another preventive health question whenever you like.",
      sources: [],
      mode: "agent",
      retrieval: "none",
      thinking: [step],
    });
  }

  let memoryBlock = "";
  if (memoryEnabled()) {
    const memories = await loadMemories({
      userId: options.userId,
      sessionId: options.sessionId,
    });
    memoryBlock = formatMemoriesForPrompt(memories);
  }

  if (options.mode === "legacy" || !agentEnabled() || !hasAgentLlm()) {
    // Multi-agent workers use tools directly (no LLM required for core path)
    if (
      options.mode !== "legacy" &&
      shouldUseMultiAgent(options.question, options.mode)
    ) {
      try {
        const result = await runMultiAgent({
          question: options.question,
          userId: options.userId,
          risk: options.risk,
          onEvent,
        });
        scheduleMemoryExtract(options, result);
        return attachTrace(result);
      } catch (error) {
        console.error("Multi-agent failed before legacy", error);
      }
    }
    const result = await runLegacy({ ...options, onEvent });
    scheduleMemoryExtract(options, result);
    return attachTrace(result);
  }

  try {
    let result: AgentRunResult;

    const wantMulti = shouldUseMultiAgent(options.question, options.mode);

    if (options.approvedPlan && options.planDecision === "approve") {
      if (wantMulti) {
        result = await runMultiAgent({
          question: options.question,
          userId: options.userId,
          risk: options.risk,
          onEvent,
        });
      } else {
        result = await executeApprovedPlan({
          question: options.question,
          userId: options.userId,
          risk: options.risk,
          plan: options.approvedPlan,
          permissionMode,
          memoryBlock,
          onEvent,
        });
      }
    } else {
      const wantPlan =
        options.mode !== "multi" &&
        (options.mode === "plan" || permissionMode !== "auto") &&
        shouldUsePlanMode(options.question, options.mode);

      if (wantPlan && !options.approvedPlan) {
        const plan = draftHeuristicPlan(options.question, options.risk);
        const step = {
          id: "plan-draft",
          label: "Plan ready — waiting for your approval",
          detail: plan.goal,
        };
        await onEvent({ type: "plan", plan, step });
        await onEvent({ type: "thinking", step });
        return attachTrace({
          answer:
            "Please review the plan below. Approve to run tools, or Decline to cancel (no tools will run).",
          sources: [],
          mode: "agent",
          retrieval: "none",
          thinking: [step],
          awaitingPlan: true,
          plan,
        });
      }

      if (wantMulti) {
        result = await runMultiAgent({
          question: options.question,
          userId: options.userId,
          risk: options.risk,
          onEvent,
        });
      } else {
        result = await runReactAgent({
          question: options.question,
          userId: options.userId,
          risk: options.risk,
          permissionMode,
          history: options.history,
          memoryBlock,
          skill,
          onEvent,
        });
      }
    }

    scheduleMemoryExtract(options, result);
    return attachTrace(result);
  } catch (error) {
    if (error instanceof AgentSafetyError) {
      const step = {
        id: "safety-stop",
        label: "Stopped by safety gate",
        detail: error.message,
      };
      await onEvent({ type: "thinking", step });
      recorder?.recordGate({
        tool: "runtime",
        allowed: false,
        reason: error.message,
      });
      return attachTrace({
        answer: `I could not complete that request safely: ${error.message}\n\nSafety reminder: this is preventive information only — not a medical diagnosis.`,
        sources: [],
        mode: "agent",
        retrieval: "none",
        thinking: [step],
      });
    }

    console.error("Agent failed, falling back to Light RAG", error);
    await onEvent({
      type: "thinking",
      step: {
        id: "agent-fallback",
        label: "Agent unavailable — using classic RAG…",
        detail:
          error instanceof Error ? error.message : "Unknown agent error",
      },
    });
    const result = await runLegacy({ ...options, onEvent });
    scheduleMemoryExtract(options, result);
    return attachTrace(result);
  }
}

function scheduleMemoryExtract(
  options: {
    userId: string;
    question: string;
    sessionId?: string;
  },
  result: AgentRunResult,
) {
  if (result.awaitingPlan) return;
  if (!memoryEnabled()) return;

  void extractAndSaveMemories({
    userId: options.userId,
    question: options.question,
    answer: result.answer,
    sessionId: options.sessionId,
  }).then((n) => {
    if (n > 0) console.info(`agent memories saved: ${n}`);
  });
}

async function runLegacy(options: {
  question: string;
  risk: RiskContext;
  onEvent?: (event: AgentEvent) => void | Promise<void>;
}): Promise<AgentRunResult> {
  await options.onEvent?.({
    type: "thinking",
    step: {
      id: "legacy-mode",
      label: "Using classic Light RAG…",
    },
  });

  const thinkingFromLegacy: AgentRunResult["thinking"] = [];
  const result = await answerWithLightRag(
    options.question,
    options.risk,
    async (step) => {
      thinkingFromLegacy.push(step);
      await options.onEvent?.({ type: "thinking", step });
    },
  );

  return {
    answer: result.answer,
    sources: result.sources,
    mode: result.mode,
    retrieval: result.retrieval,
    thinking: thinkingFromLegacy,
  };
}
