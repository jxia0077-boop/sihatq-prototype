export type PermissionMode = "read_only" | "confirm" | "auto";

/** Future write tools (P2 memory, etc.). Empty in P1 — all current tools are read-only. */
export const WRITE_TOOLS = new Set<string>([
  // "save_memory",
]);

export const READ_TOOLS = new Set([
  "get_user_risk",
  "search_knowledge",
  "get_reference_stat",
  "list_recommendations",
]);

export function getPermissionMode(): PermissionMode {
  const raw = (process.env.AGENT_PERMISSION_MODE || "confirm").toLowerCase();
  if (raw === "read_only" || raw === "readonly") return "read_only";
  if (raw === "auto") return "auto";
  return "confirm";
}

export function assertToolPermission(
  toolName: string,
  mode: PermissionMode = getPermissionMode(),
): void {
  if (WRITE_TOOLS.has(toolName)) {
    if (mode === "read_only") {
      throw new Error(
        `Write tool "${toolName}" is blocked in read_only permission mode.`,
      );
    }
    if (mode === "auto") {
      throw new Error(
        `Write tool "${toolName}" requires confirm mode (auto cannot write).`,
      );
    }
  }
}
