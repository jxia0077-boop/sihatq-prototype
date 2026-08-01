import { retrieveKnowledge } from "@/lib/ai/knowledge";

type RiskContext = {
  risk_category?: string;
  risk_level?: string;
  explanation?: string;
  comparison_text?: string;
  recommendations?: { title: string; description: string }[];
} | null;

function buildFallbackAnswer(
  question: string,
  risk: RiskContext,
  sources: string[],
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

  const retrieved = retrieveKnowledge(question);
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
        {
          role: "system",
          content:
            "You are SihatQ AI Assistant for Malaysia preventive health education. Only use the provided context. Never diagnose disease. Always remind users this is not medical advice. Keep answers concise and practical.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callGemini(prompt: string): Promise<string | null> {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
          parts: [
            {
              text: "You are SihatQ AI Assistant for Malaysia preventive health education. Only use the provided context. Never diagnose disease. Always remind users this is not medical advice. Keep answers concise and practical.",
            },
          ],
        },
      }),
    },
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

export async function answerWithLightRag(
  question: string,
  risk: RiskContext,
): Promise<{ answer: string; sources: string[]; mode: "llm" | "rules" }> {
  const chunks = retrieveKnowledge(question);
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
    "Retrieved public knowledge:",
    ...chunks.map((c) => `- [${c.source}] ${c.content}`),
    `User question: ${question}`,
  ].join("\n");

  const llm =
    (await callGemini(context)) ||
    (await callOpenAI(context));

  if (llm) {
    return { answer: llm, sources, mode: "llm" };
  }

  return {
    answer: buildFallbackAnswer(question, risk, sources),
    sources,
    mode: "rules",
  };
}
