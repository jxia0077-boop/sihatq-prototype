import type { ToolDefinition, ToolParameterSchema } from "@/lib/agent/types";

export type McpServerId = "sihatq-knowledge" | "sihatq-stats" | "sihatq-personal";

export type McpToolMeta = {
  serverId: McpServerId;
  name: string;
  /** One-line discovery description (cheap tokens). */
  shortDescription: string;
  /** Full schema — loaded only when selected/called. */
  full: ToolDefinition;
};

export type McpServerRegistration = {
  id: McpServerId;
  title: string;
  description: string;
  tools: McpToolMeta[];
};
