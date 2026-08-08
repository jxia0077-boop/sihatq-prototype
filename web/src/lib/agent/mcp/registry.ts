import type { ToolDefinition } from "@/lib/agent/types";
import { TOOL_DEFINITIONS } from "@/lib/agent/tools/definitions";
import type { McpServerRegistration, McpToolMeta } from "@/lib/agent/mcp/types";

function fullByName(name: string): ToolDefinition {
  const found = TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!found) {
    throw new Error(`Unknown builtin tool for MCP: ${name}`);
  }
  return found;
}

/**
 * In-process MCP-style servers (P3).
 * Same interface as remote MCP: register → discover (short) → full schema.
 * Remote @modelcontextprotocol/sdk servers can plug into this registry later.
 */
export const MCP_SERVERS: McpServerRegistration[] = [
  {
    id: "sihatq-personal",
    title: "SihatQ Personal Assessment",
    description: "Read-only access to the signed-in user's latest assessment.",
    tools: [
      {
        serverId: "sihatq-personal",
        name: "get_user_risk",
        shortDescription: "Load latest personal SihatQ risk assessment summary.",
        full: fullByName("get_user_risk"),
      },
      {
        serverId: "sihatq-personal",
        name: "list_recommendations",
        shortDescription: "List preventive recommendations from the assessment.",
        full: fullByName("list_recommendations"),
      },
    ],
  },
  {
    id: "sihatq-knowledge",
    title: "SihatQ Knowledge",
    description: "Hybrid retrieve over preventive-health knowledge chunks.",
    tools: [
      {
        serverId: "sihatq-knowledge",
        name: "search_knowledge",
        shortDescription:
          "Search NHMS/DOSM-style public preventive knowledge snippets.",
        full: fullByName("search_knowledge"),
      },
    ],
  },
  {
    id: "sihatq-stats",
    title: "SihatQ Reference Stats",
    description: "Read-only health_reference_stats lookups.",
    tools: [
      {
        serverId: "sihatq-stats",
        name: "get_reference_stat",
        shortDescription:
          "Look up a public prevalence/mortality reference statistic.",
        full: fullByName("get_reference_stat"),
      },
    ],
  },
];

const ALL_TOOLS: McpToolMeta[] = MCP_SERVERS.flatMap((s) => s.tools);

export function listRegisteredServers() {
  return MCP_SERVERS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    toolCount: s.tools.length,
  }));
}

/** Phase 2 — discovery: name + short description only. */
export function discoverTools(allowNames?: string[]): McpToolMeta[] {
  if (!allowNames?.length) return ALL_TOOLS;
  const allow = new Set(allowNames);
  return ALL_TOOLS.filter((t) => allow.has(t.name));
}

/** Phase 3 — full JSON Schema for one tool. */
export function loadFullToolSchema(name: string): ToolDefinition | null {
  return ALL_TOOLS.find((t) => t.name === name)?.full || null;
}

/**
 * Stub definitions for the LLM (tiny parameters) — saves context tokens.
 * Full schema is loaded at call time via loadFullToolSchema.
 */
export function buildDiscoverStubDefinitions(
  allowNames?: string[],
): ToolDefinition[] {
  return discoverTools(allowNames).map((t) => ({
    name: t.name,
    description: `${t.shortDescription} [MCP:${t.serverId} · schema lazy-loaded on call]`,
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
  }));
}

/** Token-ish size of tool list text for demo metrics. */
export function measureToolPromptChars(defs: ToolDefinition[]): number {
  return JSON.stringify(defs).length;
}

export function measureDiscoverVsFull(allowNames?: string[]) {
  const stubs = buildDiscoverStubDefinitions(allowNames);
  const full = discoverTools(allowNames).map((t) => t.full);
  const stubChars = measureToolPromptChars(stubs);
  const fullChars = measureToolPromptChars(full);
  const savedRatio =
    fullChars === 0 ? 0 : Math.max(0, 1 - stubChars / fullChars);
  return { stubChars, fullChars, savedRatio, stubCount: stubs.length };
}
