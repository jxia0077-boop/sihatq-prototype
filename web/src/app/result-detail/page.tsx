import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedMeter, AnimatedNumber } from "@/components/AnimatedMetric";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";
import { DosmMortalityCard } from "@/components/DosmMortalityCard";
import { brandImages } from "@/lib/brand-images";
import { createClient } from "@/lib/supabase/server";
import type { Recommendation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResultDetailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: result }, { data: profile }] = await Promise.all([
    supabase
      .from("risk_results")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("age_group, gender, state, lifestyle, family_history")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col pb-24">
        <AppHeader backHref="/dashboard" />
        <main className="mx-auto w-full max-w-3xl flex-grow px-5 py-10">
          <h2 className="font-headline text-3xl font-bold">No report yet</h2>
          <p className="mt-3 text-on-surface-variant">
            Complete a profile assessment to generate your detail report.
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

  const recommendations = (result.recommendations || []) as Recommendation[];
  const yourScore = Number(result.your_score ?? 50);
  const national = Number(result.national_benchmark ?? 50);
  const created = new Date(result.created_at);
  const wellnessScore = Math.max(5, Math.min(95, 100 - yourScore));
  const lifestyle = (profile?.lifestyle || {}) as {
    smoker?: boolean;
    active_exercise?: boolean;
    high_sugar?: boolean;
  };
  const familyHistory = (profile?.family_history || []) as string[];

  const metrics = [
    {
      title: "Cardiovascular signal",
      icon: "favorite",
      score: lifestyle.smoker ? 55 : lifestyle.active_exercise ? 82 : 68,
      detail: lifestyle.smoker
        ? "Smoking flagged as a cardiovascular risk factor."
        : lifestyle.active_exercise
          ? "Active exercise supports heart health habits."
          : "Activity level is a key lever for heart risk.",
    },
    {
      title: "Metabolic signal",
      icon: "water_drop",
      score: lifestyle.high_sugar || familyHistory.includes("diabetes") ? 58 : 75,
      detail: lifestyle.high_sugar
        ? "High sugar habit increases metabolic attention."
        : familyHistory.includes("diabetes")
          ? "Family diabetes history raises screening priority."
          : "No strong metabolic flags from lifestyle answers.",
    },
    {
      title: "Lifestyle signal",
      icon: "directions_run",
      score: lifestyle.active_exercise ? 84 : 62,
      detail: lifestyle.active_exercise
        ? "Exercise habit is a protective factor."
        : "Adding 20–30 minutes walking most days can help.",
    },
    {
      title: "Family history",
      icon: "group",
      score: familyHistory.includes("none") || familyHistory.length === 0 ? 80 : 60,
      detail:
        familyHistory.length === 0
          ? "No family history recorded."
          : `Reported: ${familyHistory.join(", ").replace(/_/g, " ")}`,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col pb-28">
      <AppHeader backHref="/risk-insight" />
      <main className="mx-auto w-full max-w-4xl flex-grow px-5 py-8">
        <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-primary">
              Assessment Report
            </span>
            <h2 className="font-headline text-3xl font-semibold">
              {created.toLocaleDateString("en-MY", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <p className="mt-1 text-on-surface-variant">
              Preventive insight for {profile?.state || "Malaysia"} ·{" "}
              {profile?.age_group || "age group n/a"} · {profile?.gender || "n/a"}
            </p>
          </div>
          <Link
            href="/recommendations"
            className="w-fit rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20"
          >
            View action plan
          </Link>
        </section>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_20px_40px_rgba(0,106,97,0.06)] md:col-span-2">
            <div className="absolute left-0 top-0 h-1 w-full bg-primary" />
            <div className="flex flex-col items-center gap-8 md:flex-row">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#00685f ${wellnessScore}%, #d9e6dd 0)`,
                  }}
                />
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white">
                  <AnimatedNumber
                    value={wellnessScore}
                    suffix=""
                    className="font-headline text-4xl font-bold"
                  />
                  <span className="text-xs uppercase text-on-surface-variant">
                    Wellness
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-headline text-xl font-semibold">
                  {result.risk_category}
                </h3>
                <p className="mt-2 text-on-surface-variant">{result.explanation}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">
                    {result.risk_level} Risk
                  </span>
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
                    Rule-based MVP
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-primary/10 bg-primary-container/30 p-6">
            <div>
              <h4 className="mb-4 text-sm font-semibold text-primary">
                Score comparison
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Your risk score</span>
                  <span className="font-semibold">{yourScore}</span>
                </div>
                <AnimatedMeter value={yourScore} heightClass="h-1.5" />
                <div className="flex justify-between text-sm">
                  <span>NHMS reference</span>
                  <span className="font-semibold">{national}</span>
                </div>
                <AnimatedMeter
                  value={national}
                  tone="secondary"
                  delayMs={120}
                  heightClass="h-1.5"
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-primary">{result.comparison_text}</p>
          </div>
        </div>

        <h3 className="mb-4 font-headline text-xl font-semibold">
          Metric breakdown
        </h3>
        <div className="sihatq-stagger grid grid-cols-1 gap-4 md:grid-cols-2">
          {metrics.map((metric, index) => (
            <article
              key={metric.title}
              className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-xl bg-primary-container/10 p-2">
                  <span className="material-symbols-outlined text-[28px] text-primary">
                    {metric.icon}
                  </span>
                </div>
                <span className="font-headline text-xl font-semibold text-primary">
                  <AnimatedNumber value={metric.score} delayMs={index * 90} />
                </span>
              </div>
              <h4 className="font-semibold">{metric.title}</h4>
              <p className="mt-2 text-sm text-on-surface-variant">
                {metric.detail}
              </p>
              <div className="mt-4">
                <AnimatedMeter
                  value={metric.score}
                  delayMs={index * 90}
                  heightClass="h-1"
                />
              </div>
            </article>
          ))}
        </div>

        <DosmMortalityCard />

        <h3 className="mb-4 mt-10 font-headline text-xl font-semibold">
          Recommendations snapshot
        </h3>
        <div className="space-y-3">
          {recommendations.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{item.title}</p>
                <span className="text-xs font-semibold text-primary">
                  {item.priority}
                </span>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-10 flex items-center gap-4 rounded-3xl border border-primary/15 bg-surface-container-lowest p-5 shadow-[var(--elevation-soft)]">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface-container-lowest shadow-[0_12px_28px_rgba(0,80,73,0.16)]">
            <Image
              src={brandImages.consultantPortrait.src}
              alt={brandImages.consultantPortrait.alt}
              fill
              sizes="80px"
              className="object-cover object-top"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-lg font-semibold text-primary">
              Next steps with context
            </p>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Bring this report to a clinic conversation and ask which screening
              is appropriate for your age group and family history.
            </p>
          </div>
          <Link
            href="/recommendations"
            className="hidden rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary md:inline-flex"
          >
            Review plan
          </Link>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/reminders"
            className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary"
          >
            Set reminders
          </Link>
          <Link
            href="/risk-insight"
            className="rounded-full border border-outline-variant px-5 py-3 font-semibold text-primary"
          >
            Back to insight
          </Link>
        </div>
        <Disclaimer className="mt-8" />
      </main>
      <BottomNav />
    </div>
  );
}
