import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWithLightRag } from "@/lib/ai/rag";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().trim().min(2).max(500),
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

    const { data: risk } = await supabase
      .from("risk_results")
      .select(
        "risk_category, risk_level, explanation, comparison_text, recommendations",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const result = await answerWithLightRag(parsed.data.message, risk);

    return NextResponse.json({
      reply: result.answer,
      sources: result.sources,
      mode: result.mode,
    });
  } catch {
    return NextResponse.json(
      { error: "AI assistant is temporarily unavailable." },
      { status: 500 },
    );
  }
}
