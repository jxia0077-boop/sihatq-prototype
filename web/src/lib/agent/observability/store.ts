import { createServiceClient, hasServiceRoleKey } from "@/lib/admin";
import type { AgentTraceRecord } from "@/lib/agent/observability/types";

const MEMORY_LIMIT = 80;
const memoryRing: AgentTraceRecord[] = [];

function pushMemory(record: AgentTraceRecord) {
  const idx = memoryRing.findIndex((r) => r.id === record.id);
  if (idx >= 0) memoryRing.splice(idx, 1);
  memoryRing.unshift(structuredClone(record));
  while (memoryRing.length > MEMORY_LIMIT) memoryRing.pop();
}

export function listMemoryTraces(limit = 40): AgentTraceRecord[] {
  return memoryRing.slice(0, limit).map((r) => structuredClone(r));
}

export function getMemoryTrace(id: string): AgentTraceRecord | null {
  const hit = memoryRing.find((r) => r.id === id);
  return hit ? structuredClone(hit) : null;
}

export async function persistTrace(record: AgentTraceRecord): Promise<void> {
  pushMemory(record);

  if (!hasServiceRoleKey()) return;

  try {
    const admin = createServiceClient();
    const { error } = await admin.from("agent_traces").upsert(
      {
        id: record.id,
        session_id: record.session_id,
        user_id: record.user_id,
        question: record.question,
        mode: record.mode,
        status: record.status,
        started_at: record.started_at,
        ended_at: record.ended_at,
        duration_ms: record.duration_ms,
        steps: record.steps,
        answer_preview: record.answer_preview,
        sources: record.sources,
        meta: record.meta,
      },
      { onConflict: "id" },
    );
    if (error) {
      // Table may not exist yet — memory ring still works for local demos
      console.warn("agent_traces persist skipped:", error.message);
    }
  } catch (error) {
    console.warn("agent_traces persist failed", error);
  }
}

export async function listTraces(limit = 40): Promise<{
  rows: AgentTraceRecord[];
  source: "db" | "memory" | "mixed";
  note?: string;
}> {
  const mem = listMemoryTraces(limit);

  if (!hasServiceRoleKey()) {
    return {
      rows: mem,
      source: "memory",
      note: "SUPABASE_SERVICE_ROLE_KEY missing — showing in-process traces only.",
    };
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("agent_traces")
      .select(
        "id, session_id, user_id, question, mode, status, started_at, ended_at, duration_ms, steps, answer_preview, sources, meta",
      )
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        rows: mem,
        source: "memory",
        note: error.message.includes("agent_traces")
          ? "Run supabase/migrations/006_agent_traces.sql — showing in-process traces."
          : error.message,
      };
    }

    const dbRows = (data || []) as AgentTraceRecord[];
    const seen = new Set(dbRows.map((r) => r.id));
    const extras = mem.filter((r) => !seen.has(r.id));
    return {
      rows: [...extras, ...dbRows].slice(0, limit),
      source: extras.length ? "mixed" : "db",
    };
  } catch (error) {
    return {
      rows: mem,
      source: "memory",
      note: error instanceof Error ? error.message : "DB read failed",
    };
  }
}

export async function getTrace(id: string): Promise<AgentTraceRecord | null> {
  const mem = getMemoryTrace(id);
  if (!hasServiceRoleKey()) return mem;

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("agent_traces")
      .select(
        "id, session_id, user_id, question, mode, status, started_at, ended_at, duration_ms, steps, answer_preview, sources, meta",
      )
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return data as AgentTraceRecord;
  } catch {
    /* fall through */
  }

  return mem;
}
