import {
  anthropicConfig,
  callAnthropicText,
  callAnthropicTools,
} from "@/lib/agent/llm/anthropic";
import { getActiveTrace } from "@/lib/agent/observability/context";
import type {
  ChatMessage,
  LlmMeta,
  LlmToolResponse,
  ToolCall,
  ToolDefinition,
} from "@/lib/agent/types";

type ProtocolPref = "auto" | "openai" | "anthropic" | "gemini";

function protocolPref(): ProtocolPref {
  const raw = (process.env.AGENT_LLM_PROTOCOL || "auto").toLowerCase();
  if (
    raw === "openai" ||
    raw === "anthropic" ||
    raw === "gemini" ||
    raw === "auto"
  ) {
    return raw;
  }
  return "auto";
}

function traceLlm(result: LlmToolResponse) {
  getActiveTrace()?.recordLlm(
    result.meta,
    result.kind === "error" ? "error" : result.kind,
    result.kind === "error" ? result.error : undefined,
  );
}

type OpenAiCompatConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

function collectOpenAiCompatProviders(): OpenAiCompatConfig[] {
  const list: OpenAiCompatConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    list.push({
      name: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
  }

  if (process.env.GROQ_API_KEY) {
    list.push({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    });
  }

  const doubaoKey =
    process.env.DOUBAO_API_KEY ||
    process.env.ARK_API_KEY ||
    process.env.VOLC_API_KEY;
  const doubaoModel =
    process.env.DOUBAO_MODEL ||
    process.env.ARK_MODEL ||
    process.env.DOUBAO_ENDPOINT_ID;
  if (doubaoKey && doubaoModel) {
    list.push({
      name: "doubao",
      baseUrl: (
        process.env.DOUBAO_BASE_URL ||
        "https://ark.cn-beijing.volces.com/api/v3"
      ).replace(/\/$/, ""),
      apiKey: doubaoKey,
      model: doubaoModel,
    });
  }

  if (process.env.OLLAMA_MODEL) {
    list.push({
      name: "ollama",
      baseUrl: `${(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "")}/v1`,
      apiKey: process.env.OLLAMA_API_KEY || "ollama",
      model: process.env.OLLAMA_MODEL,
    });
  }

  return list;
}

function toOpenAiMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (m.role === "tool") {
      return {
        role: "tool" as const,
        tool_call_id: m.tool_call_id || "",
        content: m.content || "",
        ...(m.name ? { name: m.name } : {}),
      };
    }
    if (m.role === "assistant" && m.tool_calls?.length) {
      return {
        role: "assistant" as const,
        content: m.content,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    return {
      role: m.role as "system" | "user" | "assistant",
      content: m.content || "",
    };
  });
}

function toolsToOpenAi(definitions: ToolDefinition[]) {
  return definitions.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

async function callOpenAiCompat(
  config: OpenAiCompatConfig,
  messages: ChatMessage[],
  definitions: ToolDefinition[],
): Promise<LlmToolResponse> {
  const started = Date.now();
  const baseMeta = (): LlmMeta => ({
    protocol: "openai",
    provider: config.name,
    model: config.model,
    latencyMs: Date.now() - started,
  });

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: toOpenAiMessages(messages),
        tools: toolsToOpenAi(definitions),
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`${config.name} tools error`, response.status, text);
      return {
        kind: "error",
        error: `${config.name}: ${response.status}`,
        meta: baseMeta(),
      };
    }

    const data = await response.json();
    const usage = data.usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;
    const meta: LlmMeta = {
      ...baseMeta(),
      model: String(data.model || config.model),
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
    };

    const message = data.choices?.[0]?.message;
    if (!message) {
      return { kind: "error", error: `${config.name}: empty response`, meta };
    }

    const rawCalls = message.tool_calls as
      | { id: string; function?: { name?: string; arguments?: string } }[]
      | undefined;

    if (rawCalls?.length) {
      const toolCalls: ToolCall[] = rawCalls.map((tc, index) => ({
        id: tc.id || `call_${config.name}_${index}`,
        name: tc.function?.name || "",
        arguments: tc.function?.arguments || "{}",
      }));
      return {
        kind: "tool_calls",
        toolCalls,
        content: message.content ?? null,
        meta,
      };
    }

    const content = String(message.content || "").trim();
    if (!content) {
      return { kind: "error", error: `${config.name}: no content`, meta };
    }
    return { kind: "message", content, meta };
  } catch (error) {
    console.error(`${config.name} tools fetch failed`, error);
    return {
      kind: "error",
      error: `${config.name}: ${error instanceof Error ? error.message : "fetch failed"}`,
      meta: baseMeta(),
    };
  }
}

function geminiKey() {
  return (
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

function toGeminiContents(messages: ChatMessage[]) {
  const contents: {
    role: "user" | "model";
    parts: Record<string, unknown>[];
  }[] = [];

  for (const message of messages) {
    if (message.role === "system") continue;

    if (message.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: message.content || "" }],
      });
      continue;
    }

    if (message.role === "assistant") {
      const parts: Record<string, unknown>[] = [];
      if (message.content) parts.push({ text: message.content });
      for (const tc of message.tool_calls || []) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments || "{}");
        } catch {
          args = {};
        }
        parts.push({
          functionCall: { name: tc.name, args },
        });
      }
      if (parts.length) contents.push({ role: "model", parts });
      continue;
    }

    if (message.role === "tool") {
      let response: unknown = message.content;
      try {
        response = JSON.parse(message.content || "{}");
      } catch {
        response = { result: message.content };
      }
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: message.name || "tool",
              response:
                typeof response === "object" && response !== null
                  ? response
                  : { result: response },
            },
          },
        ],
      });
    }
  }

  return contents;
}

function toolsToGemini(definitions: ToolDefinition[]) {
  return [
    {
      functionDeclarations: definitions.map((tool) => {
        // Gemini rejects JSON Schema fields like additionalProperties
        const { additionalProperties: _ignored, ...parameters } = tool.parameters;
        return {
          name: tool.name,
          description: tool.description,
          parameters,
        };
      }),
    },
  ];
}

async function callGeminiTools(
  messages: ChatMessage[],
  definitions: ToolDefinition[],
): Promise<LlmToolResponse> {
  const key = geminiKey();
  if (!key) return { kind: "error", error: "no gemini key" };
  const started = Date.now();

  try {
    const system = messages.find((m) => m.role === "system")?.content || "";
    const models = [
      process.env.GEMINI_MODEL,
      "gemini-2.0-flash",
      "gemini-flash-latest",
    ].filter(Boolean) as string[];
    // Deduplicate while preserving order
    const uniqueModels = [...new Set(models)];

    const contents = toGeminiContents(messages);
    if (!contents.length) {
      return { kind: "error", error: "gemini: empty contents" };
    }

    for (const model of uniqueModels) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            tools: toolsToGemini(definitions),
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
          }),
        },
      );

      if (!response.ok) {
        console.error(
          "Gemini tools error",
          model,
          response.status,
          await response.text(),
        );
        continue;
      }

      const data = await response.json();
      const usage = data.usageMetadata as
        | { promptTokenCount?: number; candidatesTokenCount?: number }
        | undefined;
      const meta: LlmMeta = {
        protocol: "gemini",
        provider: "gemini",
        model,
        latencyMs: Date.now() - started,
        promptTokens: usage?.promptTokenCount,
        completionTokens: usage?.candidatesTokenCount,
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      const toolCalls: ToolCall[] = [];
      const textParts: string[] = [];

      for (const [index, part] of parts.entries()) {
        if (part.functionCall?.name) {
          toolCalls.push({
            id: `gemini_${model}_${index}_${part.functionCall.name}`,
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          });
        } else if (part.text) {
          textParts.push(part.text);
        }
      }

      if (toolCalls.length) {
        return {
          kind: "tool_calls",
          toolCalls,
          content: textParts.join("\n").trim() || null,
          meta,
        };
      }

      const content = textParts.join("\n").trim();
      if (content) return { kind: "message", content, meta };
    }

    return {
      kind: "error",
      error: "gemini: all models failed",
      meta: {
        protocol: "gemini",
        provider: "gemini",
        model: uniqueModels[0] || "gemini",
        latencyMs: Date.now() - started,
      },
    };
  } catch (error) {
    console.error("Gemini tools fetch failed", error);
    return {
      kind: "error",
      error: `gemini: ${error instanceof Error ? error.message : "fetch failed"}`,
      meta: {
        protocol: "gemini",
        provider: "gemini",
        model: process.env.GEMINI_MODEL || "gemini",
        latencyMs: Date.now() - started,
      },
    };
  }
}

/** True if at least one tools-capable backend is configured. */
export function hasAgentLlm(): boolean {
  return Boolean(
    geminiKey() ||
      anthropicConfig() ||
      collectOpenAiCompatProviders().length > 0,
  );
}

/**
 * Dual-protocol router (P5):
 * - AGENT_LLM_PROTOCOL=auto|gemini|openai|anthropic
 * - auto: Gemini → Anthropic → OpenAI-compat (Ollama/Groq/…)
 */
export async function chatWithTools(
  messages: ChatMessage[],
  definitions: ToolDefinition[],
): Promise<LlmToolResponse> {
  if (definitions.length === 0) {
    return chatText(messages);
  }

  const pref = protocolPref();
  const tryGemini = pref === "auto" || pref === "gemini";
  const tryAnthropic = pref === "auto" || pref === "anthropic";
  const tryOpenAi = pref === "auto" || pref === "openai";

  if (tryGemini && geminiKey()) {
    const gemini = await callGeminiTools(messages, definitions);
    if (gemini.kind !== "error") {
      traceLlm(gemini);
      return gemini;
    }
    if (pref === "gemini") {
      traceLlm(gemini);
      return gemini;
    }
  }

  if (tryAnthropic && anthropicConfig()) {
    const anthropic = await callAnthropicTools(messages, definitions);
    if (anthropic.kind !== "error") {
      traceLlm(anthropic);
      return anthropic;
    }
    if (pref === "anthropic") {
      traceLlm(anthropic);
      return anthropic;
    }
  }

  if (tryOpenAi) {
    for (const provider of collectOpenAiCompatProviders()) {
      const result = await callOpenAiCompat(provider, messages, definitions);
      if (result.kind !== "error") {
        traceLlm(result);
        return result;
      }
    }
  }

  const fail: LlmToolResponse = {
    kind: "error",
    error: "No tools-capable LLM responded successfully.",
  };
  traceLlm(fail);
  return fail;
}

/** Plain chat completion without tool calling (for final plan compose). */
export async function chatText(
  messages: ChatMessage[],
): Promise<LlmToolResponse> {
  const pref = protocolPref();
  const tryGemini = pref === "auto" || pref === "gemini";
  const tryAnthropic = pref === "auto" || pref === "anthropic";
  const tryOpenAi = pref === "auto" || pref === "openai";

  if (tryGemini && geminiKey()) {
    const key = geminiKey()!;
    const system = messages.find((m) => m.role === "system")?.content || "";
    const contents = toGeminiContents(messages);
    const models = [
      process.env.GEMINI_MODEL,
      "gemini-2.0-flash",
      "gemini-flash-latest",
    ].filter(Boolean) as string[];

    for (const model of [...new Set(models)]) {
      const started = Date.now();
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
            }),
          },
        );
        if (!response.ok) {
          console.error("Gemini text error", model, response.status, await response.text());
          continue;
        }
        const data = await response.json();
        const text = (data.candidates?.[0]?.content?.parts || [])
          .map((p: { text?: string }) => p.text || "")
          .join("\n")
          .trim();
        if (text) {
          const result: LlmToolResponse = {
            kind: "message",
            content: text,
            meta: {
              protocol: "gemini",
              provider: "gemini",
              model,
              latencyMs: Date.now() - started,
            },
          };
          traceLlm(result);
          return result;
        }
      } catch (error) {
        console.error("Gemini text fetch failed", error);
      }
    }
    if (pref === "gemini") {
      const fail: LlmToolResponse = {
        kind: "error",
        error: "gemini text failed",
      };
      traceLlm(fail);
      return fail;
    }
  }

  if (tryAnthropic && anthropicConfig()) {
    const anthropic = await callAnthropicText(messages);
    if (anthropic.kind !== "error") {
      traceLlm(anthropic);
      return anthropic;
    }
    if (pref === "anthropic") {
      traceLlm(anthropic);
      return anthropic;
    }
  }

  if (tryOpenAi) {
    for (const provider of collectOpenAiCompatProviders()) {
      const started = Date.now();
      try {
        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: provider.model,
            temperature: 0.3,
            messages: toOpenAiMessages(messages),
          }),
        });
        if (!response.ok) {
          console.error(provider.name, "text error", response.status, await response.text());
          continue;
        }
        const data = await response.json();
        const content = String(data.choices?.[0]?.message?.content || "").trim();
        if (content) {
          const usage = data.usage as
            | { prompt_tokens?: number; completion_tokens?: number }
            | undefined;
          const result: LlmToolResponse = {
            kind: "message",
            content,
            meta: {
              protocol: "openai",
              provider: provider.name,
              model: String(data.model || provider.model),
              latencyMs: Date.now() - started,
              promptTokens: usage?.prompt_tokens,
              completionTokens: usage?.completion_tokens,
            },
          };
          traceLlm(result);
          return result;
        }
      } catch (error) {
        console.error(provider.name, "text fetch failed", error);
      }
    }
  }

  const fail: LlmToolResponse = {
    kind: "error",
    error: "No text LLM responded successfully.",
  };
  traceLlm(fail);
  return fail;
}
