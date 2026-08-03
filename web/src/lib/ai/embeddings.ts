/** Gemini gemini-embedding-001 → request 768 dims (matches knowledge_chunks.embedding). */

export async function embedText(text: string): Promise<number[] | null> {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        outputDimensionality: 768,
      }),
    },
  );

  if (!response.ok) {
    console.error(
      "Gemini embedding error",
      response.status,
      await response.text(),
    );
    return null;
  }

  const data = await response.json();
  const values = data.embedding?.values as number[] | undefined;
  if (!values || values.length === 0) return null;
  return values;
}
