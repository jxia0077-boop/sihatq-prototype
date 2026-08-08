import { NextResponse } from "next/server";
import {
  createServiceClient,
  hasServiceRoleKey,
  isAdminUser,
} from "@/lib/admin";
import {
  PROMPT_VERSIONS,
  replayQuestionWithPromptVersion,
  syntheticEvaluationRisk,
} from "@/lib/agent/evaluation";
import { runSihatqAgent } from "@/lib/agent/runtime";
import { getTrace } from "@/lib/agent/observability/store";
import { createClient } from "@/lib/supabase/server";
import type { RiskContext } from "@/lib/agent/types";

type ReplayMode = "agent" | "react" | "legacy" | "plan" | "multi";

const MODES = new Set<ReplayMode>(["agent", "react", "legacy", "plan", "multi"]);

function normalizeMode(value: unknown): ReplayMode {
  const mode = String(value || "multi");
  return MODES.has(mode as ReplayMode) ? (mode as ReplayMode) : "multi";
}

function normalizePromptVersion(value: unknown) {
  const requested = String(value || "");
  return PROMPT_VERSIONS.some((version) => version.id === requested)
    ? requested
    : PROMPT_VERSIONS[0].id;
}

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, supabase };
}

async function loadRiskContext(userId: string): Promise<RiskContext> {
  const select =
    "risk_category, risk_level, explanation, comparison_text, recommendations";

  if (hasServiceRoleKey()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from("risk_results")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as RiskContext) || syntheticEvaluationRisk();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("risk_results")
    .select(select)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RiskContext) || syntheticEvaluationRisk();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const { id } = await params;
  const trace = await getTrace(id);
  if (!trace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const promptVersion = normalizePromptVersion(body.promptVersion);
  const mode = normalizeMode(body.mode);
  const targetUserId = trace.user_id || gate.user.id;
  const risk = await loadRiskContext(targetUserId);
  const started = Date.now();

  const replay = await runSihatqAgent({
    question: replayQuestionWithPromptVersion(trace.question, promptVersion),
    userId: targetUserId,
    risk,
    mode,
    sessionId: `replay-${trace.id.slice(0, 8)}-${promptVersion}`,
  });

  return NextResponse.json({
    original: {
      id: trace.id,
      status: trace.status,
      mode: trace.mode,
      duration_ms: trace.duration_ms,
      answer_preview: trace.answer_preview,
      sources: trace.sources,
    },
    replay: {
      trace_id: replay.traceId,
      prompt_version: promptVersion,
      mode,
      duration_ms: Date.now() - started,
      answer: replay.answer,
      sources: replay.sources,
      retrieval: replay.retrieval,
      awaiting_plan: Boolean(replay.awaitingPlan),
    },
  });
}
