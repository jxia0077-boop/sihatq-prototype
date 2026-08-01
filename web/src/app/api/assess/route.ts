import { NextResponse } from "next/server";
import { assessRisk } from "@/lib/risk-engine";
import { createClient } from "@/lib/supabase/server";
import type { HealthReferenceStat } from "@/lib/types";
import { profileInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid profile input" },
        { status: 400 },
      );
    }

    const profile = parsed.data;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        age_group: profile.age_group,
        gender: profile.gender,
        state: profile.state,
        lifestyle: profile.lifestyle,
        family_history: profile.family_history,
        privacy_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      return NextResponse.json(
        { error: "Could not save profile. Did you run the SQL migration?" },
        { status: 500 },
      );
    }

    const { data: statsData, error: statsError } = await supabase
      .from("health_reference_stats")
      .select(
        "id, indicator, year, value, unit, source_title, source_url",
      );

    if (statsError) {
      return NextResponse.json(
        { error: "Could not load reference stats. Did you run the SQL migration?" },
        { status: 500 },
      );
    }

    const stats = (statsData || []) as HealthReferenceStat[];
    const assessment = assessRisk(profile, stats);

    const { data: riskRow, error: riskError } = await supabase
      .from("risk_results")
      .insert({
        user_id: user.id,
        risk_category: assessment.risk_category,
        risk_level: assessment.risk_level,
        explanation: assessment.explanation,
        comparison_text: assessment.comparison_text,
        recommendations: assessment.recommendations,
        your_score: assessment.your_score,
        national_benchmark: assessment.national_benchmark,
      })
      .select("id")
      .single();

    if (riskError) {
      return NextResponse.json(
        { error: "Could not save risk result." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: riskRow.id,
      ...assessment,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
