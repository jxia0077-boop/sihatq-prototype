import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";
import { DosmMortalityCard } from "@/components/DosmMortalityCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RiskInsightPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: result } = await supabase
    .from("risk_results")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col pb-24">
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl flex-grow px-5 py-10">
          <h2 className="font-headline text-3xl font-bold">No insight yet</h2>
          <p className="mt-3 text-on-surface-variant">
            Complete your profile assessment first.
          </p>
          <Link
            href="/privacy"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-on-primary"
          >
            Start assessment
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const yourScore = Number(result.your_score ?? 50);
  const national = Number(result.national_benchmark ?? 50);

  return (
    <div className="flex min-h-screen flex-col pb-28">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-grow px-5 py-8">
        <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-secondary-container">
          {result.risk_level} Risk
        </span>
        <h2 className="mt-3 font-headline text-3xl font-bold">
          {result.risk_category}
        </h2>
        <p className="mt-3 text-on-surface-variant">{result.explanation}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="text-sm text-on-surface-variant">Your Risk Score</p>
            <p className="mt-2 font-headline text-3xl font-bold text-primary">
              {yourScore}%
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${yourScore}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="text-sm text-on-surface-variant">
              Malaysian Average (reference)
            </p>
            <p className="mt-2 font-headline text-3xl font-bold text-secondary">
              {national}%
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${national}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-outline-variant/30 bg-surface-container p-5">
          <p className="text-sm font-semibold uppercase text-on-surface-variant">
            National comparison (NHMS prevalence)
          </p>
          <p className="mt-2 text-on-surface">{result.comparison_text}</p>
        </div>

        <DosmMortalityCard />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/recommendations"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-on-primary"
          >
            How to reduce my risk?
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
          <Link
            href="/ai-assistant"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-outline-variant py-4 font-semibold text-primary"
          >
            Ask AI Assistant
          </Link>
          <Link
            href="/result-detail"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-outline-variant py-4 font-semibold text-primary"
          >
            View full report
          </Link>
        </div>
        <Disclaimer className="mt-6" />
      </main>
      <BottomNav />
    </div>
  );
}
