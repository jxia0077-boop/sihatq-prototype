import { NextResponse } from "next/server";
import { z } from "zod";
import { runSihatqAgent } from "@/lib/agent";
import type { AgentEvent } from "@/lib/agent";
import { createClient } from "@/lib/supabase/server";

const planStepSchema = z.object({
  id: z.string(),
  tool: z.string().optional(),
  action: z.literal("answer").optional(),
  // Allow any JSON object from the plan card (numbers, nested values, etc.)
  args: z.record(z.string(), z.any()).optional(),
  reason: z.string(),
});

const planSchema = z.object({
  goal: z.string().max(500),
  steps: z.array(planStepSchema).min(1).max(12),
  risks: z.array(z.string()).max(20),
});

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .transform((value) => value.trim().slice(0, 1500))
    .pipe(z.string().min(1)),
});

const bodySchema = z.object({
  message: z.string().trim().min(2).max(1000),
  stream: z.boolean().optional(),
  mode: z.enum(["agent", "react", "legacy", "plan", "multi"]).optional(),
  planDecision: z.enum(["approve", "decline"]).optional(),
  approvedPlan: planSchema.optional(),
  sessionId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) =>
      !value || value.length < 4 ? undefined : value,
    ),
  history: z.array(historyItemSchema).max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const detail = first
        ? `${first.path.join(".") || "body"}: ${first.message}`
        : "invalid body";
      console.error("ai-chat validation failed", detail, parsed.error.issues);
      return NextResponse.json(
        {
          error:
            first?.path?.[0] === "message"
              ? "Please enter a short health question."
              : "Could not process this chat request. Try a shorter message or refresh the page.",
          detail,
        },
        { status: 400 },
      );
    }

    if (
      parsed.data.planDecision === "approve" &&
      !parsed.data.approvedPlan
    ) {
      return NextResponse.json(
        { error: "approvedPlan is required when approving." },
        { status: 400 },
      );
    }

    const wantsStream =
      parsed.data.stream === true ||
      (request.headers.get("accept") || "").includes("text/event-stream");

    const { data: risk } = await supabase
      .from("risk_results")
      .select(
        "risk_category, risk_level, explanation, comparison_text, recommendations",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const runOptions = {
      question: parsed.data.message,
      userId: user.id,
      risk,
      mode: parsed.data.mode,
      planDecision: parsed.data.planDecision,
      approvedPlan: parsed.data.approvedPlan,
      history: parsed.data.history,
      sessionId: parsed.data.sessionId,
    };

    if (!wantsStream) {
      const thinking: { id: string; label: string; detail?: string }[] = [];
      const result = await runSihatqAgent({
        ...runOptions,
        onEvent: (event) => {
          const step = stepFromEvent(event);
          if (step) thinking.push(step);
        },
      });
      return NextResponse.json({
        reply: result.answer,
        sources: result.sources,
        mode: result.mode,
        retrieval: result.retrieval,
        thinking: thinking.length ? thinking : result.thinking,
        awaiting_plan: result.awaitingPlan || false,
        plan: result.plan,
        trace_id: result.traceId,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        try {
          send({
            type: "thinking",
            step: {
              id: "start",
              label: "Getting ready…",
            },
          });

          const result = await runSihatqAgent({
            ...runOptions,
            onEvent: async (event) => {
              if (
                event.type === "thinking" ||
                event.type === "tool_start" ||
                event.type === "tool_end" ||
                event.type === "plan"
              ) {
                send(event);
              }
            },
          });

          send({
            type: "done",
            payload: {
              reply: result.answer,
              sources: result.sources,
              mode: result.mode,
              retrieval: result.retrieval,
              awaiting_plan: result.awaitingPlan || false,
              plan: result.plan,
              trace_id: result.traceId,
            },
          });
        } catch {
          send({
            type: "error",
            error: "AI assistant is temporarily unavailable.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "AI assistant is temporarily unavailable." },
      { status: 500 },
    );
  }
}

function stepFromEvent(event: AgentEvent) {
  if (
    event.type === "thinking" ||
    event.type === "tool_start" ||
    event.type === "tool_end" ||
    event.type === "plan"
  ) {
    return event.step;
  }
  return null;
}
