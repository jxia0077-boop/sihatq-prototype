import type {
  ChatMessage,
  LlmToolResponse,
  ToolCall,
  ToolDefinition,
} from "@/lib/agent/types";

type AnthropicConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export function anthropicConfig(): AnthropicConfig | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    baseUrl: (
      process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"
    ).replace(/\/$/, ""),
  };
}

function toolsToAnthropic(definitions: ToolDefinition[]) {
  return definitions.map((tool) => {
    const { additionalProperties: _ignored, ...parameters } = tool.parameters;
    return {
      name: tool.name,
      description: tool.description,
      input_schema: parameters,
    };
  });
}

/**
 * Convert OpenAI-style ChatMessage[] to Anthropic Messages API shape.
 * System prompts are extracted; tool rounds become tool_use / tool_result blocks.
 */
export function toAnthropicMessages(messages: ChatMessage[]): {
  system: string;
  messages: { role: "user" | "assistant"; content: unknown }[];
} {
  const systemParts: string[] = [];
  const out: { role: "user" | "assistant"; content: unknown }[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      if (message.content) systemParts.push(message.content);
      continue;
    }

    if (message.role === "user") {
      out.push({ role: "user", content: message.content || "" });
      continue;
    }

    if (message.role === "assistant") {
      if (message.tool_calls?.length) {
        const blocks: Record<string, unknown>[] = [];
        if (message.content) {
          blocks.push({ type: "text", text: message.content });
        }
        for (const tc of message.tool_calls) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(tc.arguments || "{}");
          } catch {
            input = {};
          }
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input,
          });
        }
        out.push({ role: "assistant", content: blocks });
      } else {
        out.push({ role: "assistant", content: message.content || "" });
      }
      continue;
    }

    if (message.role === "tool") {
      const block = {
        type: "tool_result",
        tool_use_id: message.tool_call_id || "",
        content: message.content || "",
      };
      const last = out[out.length - 1];
      if (last?.role === "user" && Array.isArray(last.content)) {
        (last.content as Record<string, unknown>[]).push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
    }
  }

  // Anthropic requires alternating user/assistant; merge adjacent same-role
  const merged: { role: "user" | "assistant"; content: unknown }[] = [];
  for (const msg of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === msg.role) {
      const a = Array.isArray(prev.content)
        ? prev.content
        : [{ type: "text", text: String(prev.content || "") }];
      const b = Array.isArray(msg.content)
        ? msg.content
        : [{ type: "text", text: String(msg.content || "") }];
      prev.content = [...a, ...b];
    } else {
      merged.push(msg);
    }
  }

  // Must start with user
  if (merged.length && merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(continue)" });
  }

  return {
    system: systemParts.join("\n\n"),
    messages: merged,
  };
}

export async function callAnthropicTools(
  messages: ChatMessage[],
  definitions: ToolDefinition[],
): Promise<LlmToolResponse> {
  const config = anthropicConfig();
  if (!config) return { kind: "error", error: "no anthropic key" };

  const started = Date.now();
  const { system, messages: apiMessages } = toAnthropicMessages(messages);

  try {
    const response = await fetch(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0.2,
        system: system || undefined,
        messages: apiMessages,
        tools: definitions.length ? toolsToAnthropic(definitions) : undefined,
      }),
    });

    const latencyMs = Date.now() - started;
    if (!response.ok) {
      const text = await response.text();
      console.error("Anthropic tools error", response.status, text);
      return {
        kind: "error",
        error: `anthropic: ${response.status}`,
        meta: {
          protocol: "anthropic",
          provider: "anthropic",
          model: config.model,
          latencyMs,
        },
      };
    }

    const data = await response.json();
    const blocks = (data.content || []) as {
      type?: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }[];

    const toolCalls: ToolCall[] = [];
    const textParts: string[] = [];

    for (const block of blocks) {
      if (block.type === "tool_use" && block.name) {
        toolCalls.push({
          id: block.id || `anthropic_${toolCalls.length}_${block.name}`,
          name: block.name,
          arguments: JSON.stringify(block.input || {}),
        });
      } else if (block.type === "text" && block.text) {
        textParts.push(block.text);
      }
    }

    const usage = data.usage as
      | { input_tokens?: number; output_tokens?: number }
      | undefined;
    const meta = {
      protocol: "anthropic" as const,
      provider: "anthropic",
      model: String(data.model || config.model),
      latencyMs,
      promptTokens: usage?.input_tokens,
      completionTokens: usage?.output_tokens,
    };

    if (toolCalls.length) {
      return {
        kind: "tool_calls",
        toolCalls,
        content: textParts.join("\n").trim() || null,
        meta,
      };
    }

    const content = textParts.join("\n").trim();
    if (!content) {
      return { kind: "error", error: "anthropic: empty content", meta };
    }
    return { kind: "message", content, meta };
  } catch (error) {
    console.error("Anthropic tools fetch failed", error);
    return {
      kind: "error",
      error: `anthropic: ${error instanceof Error ? error.message : "fetch failed"}`,
      meta: {
        protocol: "anthropic",
        provider: "anthropic",
        model: config.model,
        latencyMs: Date.now() - started,
      },
    };
  }
}

export async function callAnthropicText(
  messages: ChatMessage[],
): Promise<LlmToolResponse> {
  return callAnthropicTools(messages, []);
}
