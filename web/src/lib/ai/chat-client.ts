export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
};

export type AiChatDone = {
  reply: string;
  sources: string[];
  mode: "llm" | "rules";
  retrieval: "pgvector" | "keyword";
  thinking: ThinkingStep[];
};

type StreamEvent =
  | { type: "thinking"; step: ThinkingStep }
  | { type: "done"; payload: Omit<AiChatDone, "thinking"> }
  | { type: "error"; error: string };

/**
 * Call /api/ai-chat with SSE streaming of thinking steps.
 */
export async function streamAiChat(
  message: string,
  onThinking: (steps: ThinkingStep[]) => void,
): Promise<AiChatDone> {
  const response = await fetch("/api/ai-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message, stream: true }),
  });

  if (!response.ok) {
    let error = "Failed to get reply";
    try {
      const data = await response.json();
      error = data.error || error;
    } catch {
      /* ignore */
    }
    throw new Error(error);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return {
      reply: data.reply,
      sources: data.sources || [],
      mode: data.mode || "rules",
      retrieval: data.retrieval || "keyword",
      thinking: data.thinking || [],
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const thinking: ThinkingStep[] = [];
  let donePayload: Omit<AiChatDone, "thinking"> | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.replace(/^data:\s*/, "");
      let event: StreamEvent;
      try {
        event = JSON.parse(json) as StreamEvent;
      } catch {
        continue;
      }

      if (event.type === "thinking") {
        thinking.push(event.step);
        onThinking([...thinking]);
      } else if (event.type === "done") {
        donePayload = event.payload;
      } else if (event.type === "error") {
        throw new Error(event.error);
      }
    }
  }

  if (!donePayload) {
    throw new Error("Stream ended without a reply.");
  }

  return { ...donePayload, thinking };
}
