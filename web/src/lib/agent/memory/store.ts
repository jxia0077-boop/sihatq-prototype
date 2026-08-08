import { createClient } from "@/lib/supabase/server";

export type MemoryScope = "user" | "project" | "session";
export type MemoryCategory =
  | "preference"
  | "correction"
  | "project_knowledge"
  | "reference";

export type AgentMemory = {
  id?: string;
  user_id?: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  source_session_id?: string | null;
  created_at?: string;
};

export function memoryEnabled() {
  const flag = (process.env.AGENT_MEMORY_ENABLED || "true").toLowerCase();
  return !(flag === "0" || flag === "false" || flag === "off");
}

/** Fallback project facts if DB seed not applied yet. */
const BUILTIN_PROJECT: AgentMemory[] = [
  {
    scope: "project",
    category: "project_knowledge",
    content:
      "SihatQ is preventive education for Malaysia — never diagnose or prescribe.",
  },
  {
    scope: "project",
    category: "project_knowledge",
    content:
      "Prefer citing NHMS / DOSM public statistics when discussing national context.",
  },
  {
    scope: "project",
    category: "project_knowledge",
    content:
      "Always remind users to consult a qualified clinician for personal medical decisions.",
  },
];

export async function loadMemories(options: {
  userId: string;
  sessionId?: string;
  limit?: number;
}): Promise<AgentMemory[]> {
  if (!memoryEnabled()) return BUILTIN_PROJECT;

  try {
    const supabase = await createClient();
    const limit = options.limit ?? 24;
    const merged: AgentMemory[] = [];

    const { data: projectRows, error: projectErr } = await supabase
      .from("agent_memories")
      .select(
        "id, user_id, scope, category, content, source_session_id, created_at",
      )
      .eq("scope", "project")
      .order("created_at", { ascending: false })
      .limit(10);

    if (projectErr) {
      console.error("loadMemories project", projectErr.message);
      return BUILTIN_PROJECT;
    }

    merged.push(...((projectRows || []) as AgentMemory[]));

    const { data: userRows, error: userErr } = await supabase
      .from("agent_memories")
      .select(
        "id, user_id, scope, category, content, source_session_id, created_at",
      )
      .eq("user_id", options.userId)
      .eq("scope", "user")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userErr) {
      console.error("loadMemories user", userErr.message);
    } else {
      merged.push(...((userRows || []) as AgentMemory[]));
    }

    if (options.sessionId) {
      const { data: sessionRows, error: sessionErr } = await supabase
        .from("agent_memories")
        .select(
          "id, user_id, scope, category, content, source_session_id, created_at",
        )
        .eq("user_id", options.userId)
        .eq("scope", "session")
        .eq("source_session_id", options.sessionId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (sessionErr) {
        console.error("loadMemories session", sessionErr.message);
      } else {
        merged.push(...((sessionRows || []) as AgentMemory[]));
      }
    }

    if (!merged.some((r) => r.scope === "project")) {
      return [...BUILTIN_PROJECT, ...merged];
    }
    return merged.slice(0, limit);
  } catch (error) {
    console.error("loadMemories failed", error);
    return BUILTIN_PROJECT;
  }
}

export function formatMemoriesForPrompt(memories: AgentMemory[]): string {
  if (!memories.length) return "";
  const lines = memories.map(
    (m) => `- [${m.scope}/${m.category}] ${m.content}`,
  );
  return [
    "Long-term / project memories (honour preferences and corrections):",
    ...lines,
  ].join("\n");
}

export async function saveMemories(
  userId: string,
  items: Omit<AgentMemory, "id" | "created_at">[],
): Promise<number> {
  if (!memoryEnabled() || !items.length) return 0;

  const rows = items
    .filter((i) => i.scope === "user" || i.scope === "session")
    .map((i) => ({
      user_id: userId,
      scope: i.scope,
      category: i.category,
      content: i.content.trim().slice(0, 500),
      source_session_id: i.source_session_id || null,
      expires_at: i.scope === "session" ? sessionExpiry() : null,
    }))
    .filter((r) => r.content.length >= 4);

  if (!rows.length) return 0;

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("agent_memories")
      .select("content, category")
      .eq("user_id", userId)
      .in("scope", ["user", "session"])
      .order("created_at", { ascending: false })
      .limit(50);

    const seen = new Set(
      (existing || []).map((e) => `${e.category}::${normalize(e.content)}`),
    );

    const fresh = rows.filter(
      (r) => !seen.has(`${r.category}::${normalize(r.content)}`),
    );
    if (!fresh.length) return 0;

    const { error } = await supabase.from("agent_memories").insert(fresh);
    if (error) {
      console.error("saveMemories", error.message);
      return 0;
    }
    return fresh.length;
  } catch (error) {
    console.error("saveMemories failed", error);
    return 0;
  }
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}
