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
import {
  fieldErrorsFromZod,
  findForbiddenProfileKeys,
  profileInputSchema,
} from "@/lib/validation";

/**
 * Ensure profile rows are tied to an anonymous auth user only (AC 1.2.4).
 * Named/email accounts must not be used as the storage identity for profile data.
 */
async function ensureAnonymousUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const isNamedAccount = Boolean(user?.email);

  if (user && !isNamedAccount) {
    return user;
  }

  if (isNamedAccount) {
    await supabase.auth.signOut();
  }

  const { data: anonData, error: anonError } =
    await supabase.auth.signInAnonymously();

  if (anonError || !anonData?.user) {
    return {
      error:
        anonError?.message ||
        "Unauthorized. Enable Supabase Auth 'Anonymous sign-ins' to allow guest assessments.",
    } as const;
  }

  return anonData.user;
}

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
    const anonOrError = await ensureAnonymousUser(supabase);
    if ("error" in anonOrError) {
      return NextResponse.json({ error: anonOrError.error }, { status: 401 });
    }
    const user = anonOrError;

    const body = await request.json();

    const forbidden = findForbiddenProfileKeys(body);
    if (forbidden.length > 0) {
      return NextResponse.json(
        {
          error: `Identifying or clinical fields are not allowed: ${forbidden.join(", ")}.`,
          fieldErrors: {
            form: "This form only accepts non-identifying profile answers.",
          },
        },
        { status: 400 },
      );
    }

    const parsed = profileInputSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = fieldErrorsFromZod(parsed.error);
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Please correct the highlighted fields.",
          fieldErrors,
        },
        { status: 400 },
      );
    }

    // AC 1.2.1 / 1.2.4 — persist only the validated minimal fields + anonymous user_id.
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
