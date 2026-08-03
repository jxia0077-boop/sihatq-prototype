import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWithLightRag } from "@/lib/ai/rag";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().trim().min(2).max(500),
  stream: z.boolean().optional(),
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
      return NextResponse.json(
        { error: "Please enter a short health question." },
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

    if (!wantsStream) {
      const thinking: { id: string; label: string; detail?: string }[] = [];
      const result = await answerWithLightRag(
        parsed.data.message,
        risk,
        (step) => {
          thinking.push(step);
        },
      );
      return NextResponse.json({
        reply: result.answer,
        sources: result.sources,
        mode: result.mode,
        retrieval: result.retrieval,
        thinking,
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

          const result = await answerWithLightRag(
            parsed.data.message,
            risk,
            async (step) => {
              send({ type: "thinking", step });
            },
          );

          send({
            type: "done",
            payload: {
              reply: result.answer,
              sources: result.sources,
              mode: result.mode,
              retrieval: result.retrieval,
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
