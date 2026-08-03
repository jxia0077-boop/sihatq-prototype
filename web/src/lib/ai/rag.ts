import { retrieveKnowledge } from "@/lib/ai/knowledge";
import { retrieveKnowledgeHybrid } from "@/lib/ai/retrieve";

type RiskContext = {
  risk_category?: string;
  risk_level?: string;
  explanation?: string;
  comparison_text?: string;
  recommendations?: { title: string; description: string }[];
} | null;

const SYSTEM_PROMPT =
  "You are SihatQ AI Assistant for Malaysia preventive health education. Only use the provided context. Never diagnose disease. Always remind users this is not medical advice. Keep answers concise, friendly, and practical. Prefer English unless the user writes Chinese.";

function buildFallbackAnswer(
  question: string,
  risk: RiskContext,
  sources: string[],
  retrieved = retrieveKnowledge(question),
): string {
  const lines: string[] = [];

  if (risk?.risk_category) {
    lines.push(
      `Based on your latest SihatQ assessment, your insight category is **${risk.risk_category}** (${risk.risk_level || "n/a"} risk).`,
    );
    if (risk.explanation) lines.push(risk.explanation);
    if (risk.comparison_text) lines.push(risk.comparison_text);
  } else {
    lines.push(
      "I can explain preventive insights using your profile results and public Malaysian health statistics (such as NHMS).",
    );
  }

  for (const chunk of retrieved) {
    if (chunk.id === "disclaimer") continue;
    lines.push(`${chunk.content} (Source: ${chunk.source})`);
    sources.push(chunk.source);
  }

  if (risk?.recommendations?.length) {
    lines.push("Suggested next actions from your assessment:");
    for (const item of risk.recommendations.slice(0, 3)) {
      lines.push(`• ${item.title}: ${item.description}`);
    }
  }

  lines.push(
    "Safety reminder: this is preventive information only — not a medical diagnosis. Please consult a qualified doctor or clinic for medical concerns.",
  );

  return lines.join("\n\n");
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error", response.status, await response.text());
    return null;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** 豆包 / 火山方舟 — https://console.volcengine.com/ark */
async function callDoubao(prompt: string): Promise<string | null> {
  const key =
    process.env.DOUBAO_API_KEY ||
    process.env.ARK_API_KEY ||
    process.env.VOLC_API_KEY;
  const model =
    process.env.DOUBAO_MODEL ||
    process.env.ARK_MODEL ||
    process.env.DOUBAO_ENDPOINT_ID;
  if (!key || !model) return null;

  const baseUrl =
    process.env.DOUBAO_BASE_URL ||
    "https://ark.cn-beijing.volces.com/api/v3";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Doubao/ARK error", response.status, await response.text());
    return null;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** Free-tier friendly: Groq (Llama) — https://console.groq.com */
async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    console.error("Groq error", response.status, await response.text());
    return null;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** Free-tier friendly: Google Gemini — https://aistudio.google.com/apikey */
async function callGemini(prompt: string): Promise<string | null> {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const models = [
    process.env.GEMINI_MODEL,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ].filter(Boolean) as string[];

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Gemini error",
        model,
        response.status,
        await response.text(),
      );
      continue;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
  }

  return null;
}

export async function answerWithLightRag(
  question: string,
  risk: RiskContext,
): Promise<{
  answer: string;
  sources: string[];
  mode: "llm" | "rules";
  retrieval: "pgvector" | "keyword";
}> {
  const { chunks, mode: retrieval } = await retrieveKnowledgeHybrid(question);
  const sources = Array.from(new Set(chunks.map((c) => c.source)));

  const context = [
    risk
      ? `User latest risk result:
- category: ${risk.risk_category}
- level: ${risk.risk_level}
- explanation: ${risk.explanation}
- comparison: ${risk.comparison_text}
- recommendations: ${(risk.recommendations || [])
          .map((r) => r.title)
          .join("; ")}`
      : "User has no saved risk result yet.",
    `Retrieved public knowledge (${retrieval}):`,
    ...chunks.map((c) => `- [${c.source}] ${c.content}`),
    `User question: ${question}`,
    "Write a helpful answer using only this context.",
  ].join("\n");

  // Prefer Gemini for now (switch order later if using Doubao)
  const llm =
    (await callGemini(context)) ||
    (await callDoubao(context)) ||
    (await callGroq(context)) ||
    (await callOpenAI(context));

  if (llm) {
    return { answer: llm, sources, mode: "llm", retrieval };
  }

  return {
    answer: buildFallbackAnswer(question, risk, sources, chunks),
    sources,
    mode: "rules",
    retrieval,
  };
}
