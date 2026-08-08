import { executeTool } from "@/lib/agent/tools/definitions";
import {
  checkAssistantMedicalRules,
  MEDICAL_SAFETY_REPLY,
} from "@/lib/agent/safety/medical-rules";
import type { RiskContext, ToolHandlerContext } from "@/lib/agent/types";
import type { WorkerResult } from "@/lib/agent/multi-agent/types";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

function detectIndicator(question: string): string {
  const q = question.toLowerCase();
  if (/diabetes|diabet|血糖|糖尿病/.test(q)) return "diabetes";
  if (/hypertens|blood pressure|血压/.test(q)) return "hypertension";
  if (/cholesterol|胆固醇/.test(q)) return "high_cholesterol";
  if (/obese|obesity|bmi|肥胖/.test(q)) return "overweight_obesity";
  return "diabetes";
}

/** Research Worker — knowledge + public stats only. */
export async function runResearchWorker(options: {
  question: string;
  ctx: ToolHandlerContext;
  timeoutMs?: number;
}): Promise<WorkerResult> {
  const startedAt = Date.now();
  const sources: string[] = [];
  let retrieval: WorkerResult["retrieval"] = "none";

  try {
    const run = async () => {
      const knowledge = await executeTool(
        "search_knowledge",
        { query: options.question.slice(0, 200), top_k: 3 },
        options.ctx,
      );
      const stats = await executeTool(
        "get_reference_stat",
        { indicator: detectIndicator(options.question) },
        options.ctx,
      );

      for (const s of knowledge.sources || []) sources.push(s);
      for (const s of stats.sources || []) sources.push(s);
      if (knowledge.retrieval) retrieval = knowledge.retrieval;

      const chunks =
        knowledge.ok &&
        typeof knowledge.data === "object" &&
        knowledge.data &&
        "chunks" in (knowledge.data as object)
          ? (
              knowledge.data as {
                chunks: { title: string; content: string; source: string }[];
              }
            ).chunks
          : [];

      const matches =
        stats.ok &&
        typeof stats.data === "object" &&
        stats.data &&
        "matches" in (stats.data as object)
          ? (
              stats.data as {
                matches: {
                  indicator: string;
                  year: number;
                  value: number;
                  unit: string;
                  source_title?: string;
                }[];
              }
            ).matches
          : [];

      const lines: string[] = ["### Public research notes", ""];
      if (matches.length) {
        lines.push("**Reference statistics**");
        for (const m of matches.slice(0, 3)) {
          lines.push(
            `- ${m.indicator} (${m.year}): ${m.value}${m.unit === "percent" ? "%" : ` ${m.unit}`}${m.source_title ? ` — ${m.source_title}` : ""}`,
          );
        }
        lines.push("");
      }
      if (chunks.length) {
        lines.push("**Knowledge snippets**");
        for (const c of chunks.slice(0, 3)) {
          lines.push(`- ${c.title}: ${c.content.slice(0, 220)}`);
          if (c.source) sources.push(c.source);
        }
      }
      if (!matches.length && !chunks.length) {
        lines.push("- No public stats/knowledge hits for this query.");
      }

      return {
        summary: `research: ${matches.length} stats, ${chunks.length} chunks`,
        markdown: lines.join("\n"),
      };
    };

    const out = await withTimeout(
      run(),
      options.timeoutMs ?? 25000,
      "research worker",
    );

    return {
      workerId: "research",
      ok: true,
      summary: out.summary,
      markdown: out.markdown,
      sources: Array.from(new Set(sources)),
      retrieval,
      startedAt,
      finishedAt: Date.now(),
    };
  } catch (error) {
    return {
      workerId: "research",
      ok: false,
      summary: "research failed",
      markdown: "",
      sources: [],
      error: error instanceof Error ? error.message : "research error",
      startedAt,
      finishedAt: Date.now(),
    };
  }
}

/** Personalization Worker — assessment + recommendations only. */
export async function runPersonalizationWorker(options: {
  question: string;
  ctx: ToolHandlerContext;
  timeoutMs?: number;
}): Promise<WorkerResult> {
  const startedAt = Date.now();

  try {
    const run = async () => {
      const risk = await executeTool("get_user_risk", {}, options.ctx);
      const recs = await executeTool("list_recommendations", {}, options.ctx);

      const riskData =
        risk.ok && risk.data && typeof risk.data === "object"
          ? (risk.data as {
              has_assessment?: boolean;
              risk_category?: string;
              risk_level?: string;
              explanation?: string;
              comparison_text?: string;
            })
          : {};

      const recommendations =
        recs.ok &&
        recs.data &&
        typeof recs.data === "object" &&
        "recommendations" in (recs.data as object)
          ? (
              recs.data as {
                recommendations: { title: string; description: string }[];
              }
            ).recommendations
          : [];

      const lines: string[] = ["### Personal assessment notes", ""];
      if (riskData.has_assessment) {
        lines.push(
          `- Category: **${riskData.risk_category}** (${riskData.risk_level || "n/a"})`,
        );
        if (riskData.explanation) lines.push(`- ${riskData.explanation}`);
        if (riskData.comparison_text) lines.push(`- ${riskData.comparison_text}`);
      } else {
        lines.push("- No saved assessment yet — keep guidance general.");
      }
      lines.push("");
      lines.push("**Lifestyle / next-step ideas**");
      if (recommendations.length) {
        for (const r of recommendations.slice(0, 3)) {
          lines.push(`- ${r.title}: ${r.description}`);
        }
      } else {
        lines.push(
          "- Reduce sugary drinks, stay active most days, and ask a clinician about suitable screening.",
        );
      }

      return {
        summary: riskData.has_assessment
          ? `personal: ${riskData.risk_category}`
          : "personal: no assessment",
        markdown: lines.join("\n"),
      };
    };

    const out = await withTimeout(
      run(),
      options.timeoutMs ?? 25000,
      "personalization worker",
    );

    return {
      workerId: "personalization",
      ok: true,
      summary: out.summary,
      markdown: out.markdown,
      sources: [],
      startedAt,
      finishedAt: Date.now(),
    };
  } catch (error) {
    return {
      workerId: "personalization",
      ok: false,
      summary: "personalization failed",
      markdown: "",
      sources: [],
      error: error instanceof Error ? error.message : "personalization error",
      startedAt,
      finishedAt: Date.now(),
    };
  }
}

/** Safety Editor — content gate on the merged draft (no DB writes). */
export function runSafetyEditor(draft: string): WorkerResult {
  const startedAt = Date.now();
  const hit = checkAssistantMedicalRules(draft);
  if (hit) {
    return {
      workerId: "safety",
      ok: true,
      summary: `blocked: ${hit.reason}`,
      markdown: MEDICAL_SAFETY_REPLY,
      sources: [],
      startedAt,
      finishedAt: Date.now(),
    };
  }

  let markdown = draft.trim();
  const lower = markdown.toLowerCase();
  if (
    !(
      lower.includes("not a medical") ||
      lower.includes("not medical advice") ||
      (lower.includes("preventive") && lower.includes("diagnosis"))
    )
  ) {
    markdown += `\n\nSafety reminder: this is preventive information only — not a medical diagnosis. Please consult a qualified doctor or clinic for medical concerns.`;
  }

  return {
    workerId: "safety",
    ok: true,
    summary: "safety ok",
    markdown,
    sources: [],
    startedAt,
    finishedAt: Date.now(),
  };
}

export function buildCtx(
  userId: string,
  risk: RiskContext,
): ToolHandlerContext {
  return { userId, risk };
}
