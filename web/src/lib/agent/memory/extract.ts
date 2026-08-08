import { chatText } from "@/lib/agent/llm/provider";
import {
  saveMemories,
  type AgentMemory,
  type MemoryCategory,
  memoryEnabled,
} from "@/lib/agent/memory/store";

/**
 * After a completed turn, extract durable memories (heuristic + optional LLM).
 * Never stores diagnoses or prescriptions.
 */
export async function extractAndSaveMemories(options: {
  userId: string;
  question: string;
  answer: string;
  sessionId?: string;
}): Promise<number> {
  if (!memoryEnabled()) return 0;

  const heuristic = heuristicExtract(options.question, options.answer);
  let llmItems: Omit<AgentMemory, "id" | "created_at">[] = [];

  try {
    llmItems = await llmExtract(options.question, options.answer);
  } catch (error) {
    console.error("llmExtract failed", error);
  }

  const merged = dedupeItems([
    ...heuristic.map((h) => ({
      ...h,
      user_id: options.userId,
      source_session_id: options.sessionId || null,
    })),
    ...llmItems.map((h) => ({
      ...h,
      user_id: options.userId,
      source_session_id: options.sessionId || null,
    })),
  ]);

  return saveMemories(options.userId, merged);
}

function heuristicExtract(
  question: string,
  answer: string,
): Omit<AgentMemory, "id" | "created_at" | "user_id">[] {
  const items: Omit<AgentMemory, "id" | "created_at" | "user_id">[] = [];
  const q = question.toLowerCase();
  const blob = `${question}\n${answer}`;

  if (
    /\b(prefer english|in english|english only|只要英文|用英文)\b/i.test(blob)
  ) {
    items.push({
      scope: "user",
      category: "preference",
      content: "User prefers English replies.",
    });
  }
  if (/\b(prefer chinese|用中文|中文回答)\b/i.test(blob)) {
    items.push({
      scope: "user",
      category: "preference",
      content: "User prefers Chinese replies.",
    });
  }
  if (
    /\b(don't scare|not scary|less alarming|不要吓人|别吓我)\b/i.test(blob)
  ) {
    items.push({
      scope: "user",
      category: "preference",
      content: "User prefers calm, non-alarming wording.",
    });
  }
  if (/\b(actually|correction|i meant|更正|我说的是)\b/i.test(q)) {
    items.push({
      scope: "user",
      category: "correction",
      content: `User correction note: ${question.slice(0, 200)}`,
    });
  }
  if (/\b(family history|家族史)\b/i.test(blob)) {
    items.push({
      scope: "user",
      category: "reference",
      content: "User discussed family history in preventive context.",
    });
  }

  return items;
}

async function llmExtract(
  question: string,
  answer: string,
): Promise<Omit<AgentMemory, "id" | "created_at" | "user_id">[]> {
  const prompt = `Extract up to 3 durable memories from this SihatQ chat turn.
Return ONLY JSON array of objects: {"category":"preference|correction|reference","content":"..."}.
Rules: no diagnosis, no prescriptions, no sensitive IDs. If nothing durable, return [].

User: ${question.slice(0, 400)}
Assistant: ${answer.slice(0, 800)}`;

  const result = await chatText([
    {
      role: "system",
      content:
        "You extract short user preference/correction memories for a preventive health app.",
    },
    { role: "user", content: prompt },
  ]);

  if (result.kind !== "message") return [];

  const match = result.content.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as {
      category?: string;
      content?: string;
    }[];
    if (!Array.isArray(parsed)) return [];

    const allowed: MemoryCategory[] = [
      "preference",
      "correction",
      "reference",
    ];

    return parsed
      .filter(
        (row) =>
          row &&
          typeof row.content === "string" &&
          allowed.includes(row.category as MemoryCategory),
      )
      .slice(0, 3)
      .map((row) => ({
        scope: "user" as const,
        category: row.category as MemoryCategory,
        content: String(row.content).slice(0, 500),
      }));
  } catch {
    return [];
  }
}

function dedupeItems(
  items: Omit<AgentMemory, "id" | "created_at">[],
): Omit<AgentMemory, "id" | "created_at">[] {
  const seen = new Set<string>();
  const out: Omit<AgentMemory, "id" | "created_at">[] = [];
  for (const item of items) {
    const key = `${item.category}::${item.content.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
