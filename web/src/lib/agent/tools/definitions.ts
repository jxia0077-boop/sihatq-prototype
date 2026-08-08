import { createClient } from "@/lib/supabase/server";
import { retrieveKnowledgeHybrid } from "@/lib/ai/retrieve";
import type {
  ToolDefinition,
  ToolHandlerContext,
  ToolResult,
} from "@/lib/agent/types";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_user_risk",
    description:
      "Load the signed-in user's latest SihatQ assessment (category, level, explanation, comparison). Call this when the question depends on personal results.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "search_knowledge",
    description:
      "Search SihatQ public preventive-health knowledge (NHMS/DOSM-style education snippets). Use for Malaysian public health context. Not a diagnosis.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query in English or Chinese",
        },
        top_k: {
          type: "integer",
          description: "Number of chunks to return (1-5). Default 3.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_reference_stat",
    description:
      "Look up one row from public health_reference_stats by indicator keyword (and optional Malaysian state). Returns prevalence/mortality reference figures only.",
    parameters: {
      type: "object",
      properties: {
        indicator: {
          type: "string",
          description:
            "Indicator keyword, e.g. diabetes, hypertension, obesity, IHD, pneumonia",
        },
        state: {
          type: "string",
          description: "Optional Malaysian state name filter",
        },
      },
      required: ["indicator"],
      additionalProperties: false,
    },
  },
  {
    name: "list_recommendations",
    description:
      "List preventive next-step recommendations from the user's latest assessment.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
): Promise<ToolResult> {
  switch (name) {
    case "get_user_risk":
      return executeGetUserRisk(ctx);
    case "search_knowledge":
      return executeSearchKnowledge(args);
    case "get_reference_stat":
      return executeGetReferenceStat(args);
    case "list_recommendations":
      return executeListRecommendations(ctx);
    default:
      return {
        ok: false,
        summary: `Unknown tool ${name}`,
        data: { error: "unknown_tool" },
      };
  }
}

function executeGetUserRisk(ctx: ToolHandlerContext): ToolResult {
  if (!ctx.risk?.risk_category) {
    return {
      ok: true,
      summary: "No saved assessment yet",
      data: {
        has_assessment: false,
        message:
          "User has not completed a SihatQ assessment. Give general preventive guidance only.",
      },
    };
  }

  return {
    ok: true,
    summary: `${ctx.risk.risk_category} (${ctx.risk.risk_level || "n/a"})`,
    data: {
      has_assessment: true,
      risk_category: ctx.risk.risk_category,
      risk_level: ctx.risk.risk_level,
      explanation: ctx.risk.explanation,
      comparison_text: ctx.risk.comparison_text,
    },
  };
}

async function executeSearchKnowledge(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const query = String(args.query || "");
  const topK = typeof args.top_k === "number" ? args.top_k : 3;
  const { chunks, mode } = await retrieveKnowledgeHybrid(query, topK);
  const usable = chunks.filter((c) => c.id !== "disclaimer");
  const sources = Array.from(new Set(usable.map((c) => c.source)));

  return {
    ok: true,
    summary: `Found ${usable.length} chunk(s) via ${mode}`,
    retrieval: mode,
    sources,
    data: {
      retrieval: mode,
      chunks: usable.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        source: c.source,
      })),
    },
  };
}

async function executeGetReferenceStat(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const indicator = String(args.indicator || "").trim();
  const state =
    typeof args.state === "string" ? args.state.trim() : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("health_reference_stats")
    .select(
      "indicator, year, state, age_group, gender, value, unit, source_title, source_url",
    )
    .ilike("indicator", `%${indicator}%`)
    .limit(5);

  if (state) {
    query = query.ilike("state", `%${state}%`);
  }

  const { data, error } = await query;

  if (error) {
    return {
      ok: false,
      summary: "Failed to query reference stats",
      data: { error: error.message },
    };
  }

  if (!data?.length) {
    return {
      ok: true,
      summary: "No matching reference stats",
      data: { matches: [] },
      sources: [],
    };
  }

  const sources = Array.from(
    new Set(
      data
        .map((row) => row.source_title || row.source_url)
        .filter(Boolean) as string[],
    ),
  );

  return {
    ok: true,
    summary: `Matched ${data.length} stat row(s)`,
    sources,
    data: { matches: data },
  };
}

function executeListRecommendations(ctx: ToolHandlerContext): ToolResult {
  const items = ctx.risk?.recommendations || [];
  if (!items.length) {
    return {
      ok: true,
      summary: "No recommendations on file",
      data: {
        recommendations: [],
        message: "No assessment recommendations available.",
      },
    };
  }

  return {
    ok: true,
    summary: `${items.length} recommendation(s)`,
    data: {
      recommendations: items.map((item) => ({
        title: item.title,
        description: item.description,
      })),
    },
  };
}
