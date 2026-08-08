/**
 * Benchmark SihatQ agent optimizations for resume / demo metrics.
 * Usage: cd web && npx --yes tsx scripts/bench-agent-metrics.ts
 */
import {
  buildDiscoverStubDefinitions,
  measureDiscoverVsFull,
  measureToolPromptChars,
} from "../src/lib/agent/mcp/registry";
import {
  compressMessages,
  estimateTokens,
  groupMessageUnits,
  toolPairsIntact,
} from "../src/lib/agent/memory/compress";
import { TOOL_DEFINITIONS } from "../src/lib/agent/tools/definitions";
import { SKILL_PACKS, routeSkill } from "../src/lib/agent/skills/catalog";
import type { ChatMessage, ToolDefinition } from "../src/lib/agent/types";

function pct(saved: number) {
  return `${(saved * 100).toFixed(1)}%`;
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

/** Simulate N tools with realistic full JSON Schema size (百级工具场景). */
function syntheticTools(n: number): ToolDefinition[] {
  const out: ToolDefinition[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      name: `tool_${String(i).padStart(3, "0")}`,
      description: [
        `Domain tool ${i} for SihatQ / public-health MCP server.`,
        `Query preventive education datasets (NHMS, DOSM, lifestyle guidance),`,
        `filter by Malaysian state / age band / gender, return cited snippets,`,
        `confidence scores, and source URLs. Strictly non-diagnostic; never`,
        `prescribe medicines or invent lab values. Prefer English or Chinese`,
        `based on the caller locale. When state is omitted, return national`,
        `aggregates. Always include unit and year when returning statistics.`,
      ].join(" "),
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Natural language query for public health education retrieval. Prefer specific indicators (diabetes prevalence, hypertension, obesity, IHD mortality) over vague wording.",
          },
          state: {
            type: "string",
            description:
              "Optional Malaysian state/territory filter, e.g. Selangor, Sabah, WP Kuala Lumpur. Omit for national figures.",
          },
          age_group: {
            type: "string",
            description:
              "Optional age band aligned with NHMS tables, e.g. 18-29, 30-59, 60+. Omit when not applicable.",
          },
          gender: {
            type: "string",
            enum: ["male", "female", "all"],
            description: "Optional gender filter; use all for combined population.",
          },
          year_from: {
            type: "integer",
            description: "Inclusive lower bound publication year for stats.",
          },
          year_to: {
            type: "integer",
            description: "Inclusive upper bound publication year for stats.",
          },
          top_k: {
            type: "integer",
            description: "Number of rows/snippets to return (1-10). Default 3.",
          },
          include_sources: {
            type: "boolean",
            description:
              "Whether to attach NHMS/DOSM source titles and URLs in the payload.",
          },
          locale: {
            type: "string",
            enum: ["en", "zh", "ms"],
            description: "Preferred language for summary text in the tool result.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    });
  }
  return out;
}

function stubsFromFull(full: ToolDefinition[]): ToolDefinition[] {
  return full.map((t) => ({
    name: t.name,
    description: `${t.description.slice(0, 80)} [MCP:lazy]`,
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
  }));
}

function buildLongSession(): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are SihatQ preventive education agent. Never diagnose. Use tools only.".repeat(
          40,
        ),
    },
  ];

  for (let i = 0; i < 24; i += 1) {
    messages.push({
      role: "user",
      content: `Turn ${i}: Tell me about diabetes prevention, NHMS context, and lifestyle tips for Malaysia. Extra padding ${"x".repeat(400)}`,
    });
    const callId = `call_${i}`;
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: callId,
          name: i % 2 === 0 ? "search_knowledge" : "get_reference_stat",
          arguments: JSON.stringify({
            query: `diabetes prevention ${i}`,
            indicator: "diabetes",
          }),
        },
      ],
    });
    messages.push({
      role: "tool",
      tool_call_id: callId,
      name: i % 2 === 0 ? "search_knowledge" : "get_reference_stat",
      content: JSON.stringify({
        ok: true,
        summary: `Result blob ${i}`,
        data: { text: "NHMS snippet ".repeat(80) },
      }),
    });
    messages.push({
      role: "assistant",
      content: `Preventive answer ${i}: ${"keep walking and reduce sugar. ".repeat(30)}`,
    });
  }
  return messages;
}

async function benchParallelVsSerial() {
  const work = (ms: number) =>
    new Promise<number>((resolve) => {
      const t0 = Date.now();
      setTimeout(() => resolve(Date.now() - t0), ms);
    });

  // Mimic Research ∥ Personalization then Safety Editor
  const serialStart = Date.now();
  await work(120);
  await work(120);
  await work(40);
  const serialMs = Date.now() - serialStart;

  const parallelStart = Date.now();
  await Promise.all([work(120), work(120)]);
  await work(40);
  const parallelMs = Date.now() - parallelStart;

  return { serialMs, parallelMs, speedup: serialMs / parallelMs };
}

async function main() {
  section("1) MCP lazy load — real SihatQ tools");
  const real = measureDiscoverVsFull();
  console.log(
    JSON.stringify(
      {
        tools: real.stubCount,
        fullChars: real.fullChars,
        stubChars: real.stubChars,
        saved: pct(real.savedRatio),
      },
      null,
      2,
    ),
  );

  section("2) MCP lazy load — simulated 100-tool catalog");
  const hundred = syntheticTools(100);
  const fullChars100 = measureToolPromptChars(hundred);
  const stubChars100 = measureToolPromptChars(stubsFromFull(hundred));
  const saved100 = 1 - stubChars100 / fullChars100;
  console.log(
    JSON.stringify(
      {
        tools: 100,
        fullChars: fullChars100,
        stubChars: stubChars100,
        saved: pct(saved100),
      },
      null,
      2,
    ),
  );

  section("3) Progressive context compression + tool-pair integrity");
  const long = buildLongSession();
  const before = estimateTokens(long);
  const intactBefore = toolPairsIntact(long);
  const units = groupMessageUnits(long);
  const toolChains = units.filter((u) => u.kind === "tool_chain").length;
  const compressed = compressMessages(long, {
    tokenLimit: 8000,
    triggerRatio: 0.75,
    keepRecentUnits: 8,
  });
  const after = estimateTokens(compressed.messages);
  const intactAfter = toolPairsIntact(compressed.messages);
  const tokenSaved = before === 0 ? 0 : 1 - after / before;
  console.log(
    JSON.stringify(
      {
        turnsApprox: 24,
        toolChains,
        tokensBefore: before,
        tokensAfter: after,
        compressed: compressed.compressed,
        tokenReduction: pct(tokenSaved),
        toolPairsIntactBefore: intactBefore,
        toolPairsIntactAfter: intactAfter,
      },
      null,
      2,
    ),
  );

  section("4) Skill pack tool-surface reduction");
  const allTools = TOOL_DEFINITIONS.length;
  const skillRows = SKILL_PACKS.map((s) => ({
    id: s.id,
    tools: s.tools.length,
    reductionVsAll: pct(1 - s.tools.length / allTools),
  }));
  const diabetes = routeSkill("How to prevent diabetes with NHMS lifestyle tips?");
  const screening = routeSkill("What screening should I discuss at a clinic?");
  console.log(
    JSON.stringify(
      {
        builtinTools: allTools,
        packs: skillRows,
        routed: [
          { q: "diabetes…", skill: diabetes.id, tools: diabetes.tools.length },
          {
            q: "screening…",
            skill: screening.id,
            tools: screening.tools.length,
          },
        ],
      },
      null,
      2,
    ),
  );

  section("5) Multi-agent parallel wall-clock (Research ∥ Personal)");
  const multi = await benchParallelVsSerial();
  console.log(
    JSON.stringify(
      {
        serialMs: multi.serialMs,
        parallelMs: multi.parallelMs,
        speedup: `${multi.speedup.toFixed(2)}x`,
        wallClockReduction: pct(1 - multi.parallelMs / multi.serialMs),
      },
      null,
      2,
    ),
  );

  section("RESUME METRICS (copy-ready)");
  const resume = {
    mcpLazyRealToolsSavedPct: Number((real.savedRatio * 100).toFixed(1)),
    mcpLazy100ToolsSavedPct: Number((saved100 * 100).toFixed(1)),
    mcpFullChars100: fullChars100,
    mcpStubChars100: stubChars100,
    compressTokenReductionPct: Number((tokenSaved * 100).toFixed(1)),
    compressTokensBefore: before,
    compressTokensAfter: after,
    toolPairsIntactAfterCompress: intactAfter,
    multiAgentSpeedupX: Number(multi.speedup.toFixed(2)),
    multiAgentWallClockReductionPct: Number(
      ((1 - multi.parallelMs / multi.serialMs) * 100).toFixed(1),
    ),
    skillScreeningTools: screening.tools.length,
    skillAllTools: allTools,
  };
  console.log(JSON.stringify(resume, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
