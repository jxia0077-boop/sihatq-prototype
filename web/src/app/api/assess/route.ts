import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assessRisk } from "@/lib/risk-engine";
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
} from "@/lib/redis";
import { PRIVACY_CONSENT_COOKIE } from "@/lib/privacy-consent";
import { createClient } from "@/lib/supabase/server";
import type { HealthReferenceStat } from "@/lib/types";
import { profileInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get(PRIVACY_CONSENT_COOKIE)?.value !== "accepted") {
      return NextResponse.json(
        { error: "Privacy consent is required before submitting a profile." },
        { status: 403 },
      );
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    let user = userData.user;

    if (!user) {
      // Guest mode: create an anonymous Supabase session so we can write
      // profiles / risk_results under an auth.uid().
      const { data: anonData, error: anonError } =
        await supabase.auth.signInAnonymously();

      if (anonError || !anonData?.user) {
        return NextResponse.json(
          {
            error:
              anonError?.message ||
              "Unauthorized. Enable Supabase Auth 'Anonymous sign-ins' to allow guest assessments.",
          },
          { status: 401 },
        );
      }

      user = anonData.user;
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

    let stats =
      (await cacheGet<HealthReferenceStat[]>(CACHE_KEYS.allReferenceStats)) ||
      null;

    if (!stats) {
      const { data: statsData, error: statsError } = await supabase
        .from("health_reference_stats")
        .select(
          "id, indicator, year, value, unit, source_title, source_url",
        );

      if (statsError) {
        return NextResponse.json(
          {
            error:
              "Could not load reference stats. Did you run the SQL migration?",
          },
          { status: 500 },
        );
      }

      stats = (statsData || []) as HealthReferenceStat[];
      await cacheSet(CACHE_KEYS.allReferenceStats, stats);
    }

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
