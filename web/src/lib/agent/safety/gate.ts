import { z } from "zod";
import type { ToolCall, ToolDefinition } from "@/lib/agent/types";
import {
  assertToolPermission,
  getPermissionMode,
  type PermissionMode,
} from "@/lib/agent/safety/permissions";

const DEFAULT_ALLOWED_TOOLS = new Set([
  "get_user_risk",
  "search_knowledge",
  "get_reference_stat",
  "list_recommendations",
]);

export class AgentSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentSafetyError";
  }
}

/** Whitelist + permission mode + JSON/Zod. Reject = stop. */
export function gateToolCall(
  call: ToolCall,
  definitions: ToolDefinition[],
  permissionMode: PermissionMode = getPermissionMode(),
  allowedTools: Set<string> = DEFAULT_ALLOWED_TOOLS,
): Record<string, unknown> {
  if (!allowedTools.has(call.name)) {
    throw new AgentSafetyError(
      `Tool "${call.name}" is not allowed for the active skill.`,
    );
  }

  if (!definitions.some((d) => d.name === call.name)) {
    throw new AgentSafetyError(`Unknown tool "${call.name}".`);
  }

  try {
    assertToolPermission(call.name, permissionMode);
  } catch (error) {
    throw new AgentSafetyError(
      error instanceof Error ? error.message : "Permission denied.",
    );
  }

  let raw: unknown = {};
  try {
    raw = call.arguments?.trim() ? JSON.parse(call.arguments) : {};
  } catch {
    throw new AgentSafetyError(
      `Invalid JSON arguments for tool "${call.name}".`,
    );
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AgentSafetyError(
      `Arguments for "${call.name}" must be a JSON object.`,
    );
  }

  const args = raw as Record<string, unknown>;

  if ("user_id" in args || "userId" in args) {
    throw new AgentSafetyError(
      "Passing user_id is not allowed; identity comes from the session.",
    );
  }

  switch (call.name) {
    case "get_user_risk":
    case "list_recommendations":
      return parseArgs(call.name, z.object({}).passthrough(), args);
    case "search_knowledge":
      return parseArgs(
        call.name,
        z
          .object({
            query: z.string().trim().min(2).max(300),
            top_k: z.number().int().min(1).max(5).optional(),
          })
          .passthrough(),
        args,
      );
    case "get_reference_stat":
      return parseArgs(
        call.name,
        z
          .object({
            indicator: z.string().trim().min(2).max(120),
            state: z.string().trim().min(2).max(80).optional(),
          })
          .passthrough(),
        args,
      );
    default:
      throw new AgentSafetyError(`Unhandled tool "${call.name}".`);
  }
}

function parseArgs<T extends z.ZodType>(
  toolName: string,
  schema: T,
  args: Record<string, unknown>,
): z.infer<T> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new AgentSafetyError(
      `Invalid arguments for "${toolName}": ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data;
}
