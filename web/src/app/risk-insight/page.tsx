import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedMeter, AnimatedNumber } from "@/components/AnimatedMetric";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";
import { DosmMortalityCard } from "@/components/DosmMortalityCard";
import { brandImages } from "@/lib/brand-images";
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
        <span className="sihatq-fade-up inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-secondary-container">
          {result.risk_level} Risk
        </span>
        <h2 className="sihatq-fade-up sihatq-delay-1 mt-3 font-headline text-3xl font-bold">
          {result.risk_category}
        </h2>
        <p className="sihatq-fade-up sihatq-delay-2 mt-3 text-on-surface-variant">
          {result.explanation}
        </p>

        <div className="sihatq-stagger mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="text-sm text-on-surface-variant">Your Risk Score</p>
            <p className="mt-2 font-headline text-3xl font-bold text-primary">
              <AnimatedNumber value={yourScore} />
            </p>
            <div className="mt-4">
              <AnimatedMeter value={yourScore} />
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="text-sm text-on-surface-variant">
              Malaysian Average (reference)
            </p>
            <p className="mt-2 font-headline text-3xl font-bold text-secondary">
              <AnimatedNumber value={national} delayMs={120} />
            </p>
            <div className="mt-4">
              <AnimatedMeter value={national} tone="secondary" delayMs={120} />
            </div>
          </div>
        </div>

        <div className="sihatq-fade-up mt-6 rounded-2xl border border-outline-variant/30 bg-surface-container p-5">
          <p className="text-sm font-semibold uppercase text-on-surface-variant">
            National comparison (NHMS prevalence)
          </p>
          <p className="mt-2 text-on-surface">{result.comparison_text}</p>
        </div>

        <section className="sihatq-fade-up sihatq-delay-1 mt-6 overflow-hidden rounded-3xl border border-primary/15 bg-surface-container-lowest shadow-[var(--elevation-soft)]">
          <div className="relative h-48">
            <Image
              src={brandImages.parkWalk.src}
              alt={brandImages.parkWalk.alt}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,50,45,0.74),rgba(0,50,45,0.16)_62%,transparent)]" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <p className="font-headline text-xl font-semibold">
                Small daily movement can shift the trend.
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/82">
                Use the score as a prompt for walking, screening, and better
                clinic conversations, not as a label.
              </p>
            </div>
          </div>
        </section>

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
