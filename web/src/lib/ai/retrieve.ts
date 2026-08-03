import { createClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/ai/embeddings";
import {
  HEALTH_KNOWLEDGE,
  retrieveKnowledge,
  type KnowledgeChunk,
} from "@/lib/ai/knowledge";

type MatchRow = {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[] | null;
  similarity: number;
};

function withDisclaimer(chunks: KnowledgeChunk[], limit: number): KnowledgeChunk[] {
  const top = [...chunks];
  if (!top.some((c) => c.id === "disclaimer")) {
    const disclaimer = HEALTH_KNOWLEDGE.find((c) => c.id === "disclaimer");
    if (disclaimer) top.push(disclaimer);
  }
  return top.slice(0, limit + 1);
}

/**
 * Hybrid retrieval:
 * 1) Gemini embedding + pgvector match_knowledge_chunks
 * 2) Fallback to keyword retrieveKnowledge()
 */
export async function retrieveKnowledgeHybrid(
  question: string,
  limit = 3,
): Promise<{ chunks: KnowledgeChunk[]; mode: "pgvector" | "keyword" }> {
  try {
    const embedding = await embedText(question);
    if (!embedding) {
      return { chunks: retrieveKnowledge(question, limit), mode: "keyword" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      match_count: limit,
      match_threshold: 0.4,
    });

    if (error || !data || data.length === 0) {
      if (error) {
        console.error("pgvector match error (using keyword fallback)", error.message);
      }
      return { chunks: retrieveKnowledge(question, limit), mode: "keyword" };
    }

    const chunks = (data as MatchRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      source: row.source,
      tags: row.tags || [],
    }));

    return { chunks: withDisclaimer(chunks, limit), mode: "pgvector" };
  } catch (error) {
    console.error("retrieveKnowledgeHybrid failed", error);
    return { chunks: retrieveKnowledge(question, limit), mode: "keyword" };
  }
}
