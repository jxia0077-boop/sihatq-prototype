import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import {
  evaluateStaticReadiness,
  runSmokeEvaluation,
  summarizeEvaluation,
  syntheticEvaluationRisk,
} from "@/lib/agent/evaluation";
import { listTraces } from "@/lib/agent/observability/store";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, supabase };
}

export async function GET() {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const { rows, source, note } = await listTraces(80);
  const results = evaluateStaticReadiness(rows);

  return NextResponse.json({
    summary: summarizeEvaluation(results),
    results,
    trace_source: source,
    note,
  });
}

export async function POST() {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const { data: risk } = await gate.supabase
    .from("risk_results")
    .select(
      "risk_category, risk_level, explanation, comparison_text, recommendations",
    )
    .eq("user_id", gate.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const smoke = await runSmokeEvaluation({
    userId: gate.user.id,
    risk: risk || syntheticEvaluationRisk(),
  });

  const { rows, source, note } = await listTraces(80);
  const staticResults = evaluateStaticReadiness(rows);
  const results = [...smoke, ...staticResults];

  return NextResponse.json({
    summary: summarizeEvaluation(results),
    results,
    trace_source: source,
    note,
  });
}
