import type { AgentPlan, AgentPlanStep, RiskContext } from "@/lib/agent/types";
import { routeSkill } from "@/lib/agent/skills/catalog";

const COMPLEX_RE =
  /\b(based on my|compare|comparison|NHMS|DOSM|screening|recommend|以及|并且|根据我的|对比|筛查)\b/i;

/** Heuristic: long or multi-intent questions benefit from Plan Mode. */
export function shouldUsePlanMode(
  question: string,
  forced?: "plan" | "react" | "agent" | "legacy",
): boolean {
  if (forced === "plan") return true;
  if (forced === "react" || forced === "legacy") return false;

  const defaultMode = (process.env.AGENT_DEFAULT_MODE || "react").toLowerCase();
  if (defaultMode === "plan") return true;

  const q = question.trim();
  if (q.length < 70 && !COMPLEX_RE.test(q)) return false;
  if (q.length >= 100) return true;
  if (COMPLEX_RE.test(q)) return true;
  if ((q.match(/\band\b/gi) || []).length >= 1 && q.length >= 70) return true;
  return false;
}

export function draftHeuristicPlan(
  question: string,
  risk: RiskContext,
): AgentPlan {
  const skill = routeSkill(question);
  const allow = new Set(skill.tools);
  const steps: AgentPlanStep[] = [];
  const q = question.toLowerCase();
  let id = 1;

  const pushTool = (
    tool: string,
    reason: string,
    args?: Record<string, unknown>,
  ) => {
    if (!allow.has(tool)) return;
    steps.push({
      id: String(id++),
      tool,
      reason,
      ...(args ? { args } : {}),
    });
  };

  const needsPersonal =
    /\b(my|i |me |mine|assessment|risk|profile|我的|评估|风险)\b/i.test(
      question,
    ) || Boolean(risk?.risk_category);

  if (needsPersonal) {
    pushTool("get_user_risk", "Load your latest SihatQ assessment context");
  }

  if (
    /\b(recommend|action|screening|next step|建议|筛查|下一步)\b/i.test(question)
  ) {
    pushTool(
      "list_recommendations",
      "List preventive next steps from your assessment",
    );
  }

  const indicator =
    detectIndicator(q) ||
    (risk?.risk_category?.toLowerCase().includes("diabetes")
      ? "diabetes"
      : null);

  if (indicator || /\b(nhms|dosm|stat|prevalence|全国|统计)\b/i.test(question)) {
    pushTool("get_reference_stat", "Look up public reference statistics", {
      indicator: indicator || "diabetes",
    });
  }

  pushTool(
    "search_knowledge",
    "Retrieve related preventive-health knowledge snippets",
    {
      query: question.slice(0, 200),
      top_k: 3,
    },
  );

  steps.push({
    id: String(id++),
    action: "answer",
    reason: `Compose educational reply (skill: ${skill.id})`,
  });

  return {
    goal: `Answer preventively [${skill.id}]: ${question.slice(0, 100)}`,
    steps,
    risks: [
      "Must not diagnose disease",
      "Must not prescribe or change medicines",
      "Must not invent lab values or NHMS numbers",
      `Only tools from skill ${skill.id}`,
    ],
  };
}

function detectIndicator(q: string): string | null {
  if (/diabetes|diabet|血糖|糖尿病/.test(q)) return "diabetes";
  if (/hypertens|blood pressure|血压|高血压/.test(q)) return "hypertension";
  if (/cholesterol|胆固醇/.test(q)) return "high_cholesterol";
  if (/obese|obesity|bmi|肥胖超重|超重/.test(q)) return "overweight_obesity";
  if (/\bihd\b|heart|心脏|冠心病/.test(q)) return "IHD";
  if (/pneumonia|肺炎/.test(q)) return "pneumonia";
  return null;
}
