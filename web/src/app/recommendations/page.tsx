import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";
import { brandImages } from "@/lib/brand-images";
import { createClient } from "@/lib/supabase/server";
import type { Recommendation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
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

  const recommendations = (result?.recommendations || []) as Recommendation[];

  return (
    <div className="flex min-h-screen flex-col pb-28">
      <AppHeader backHref="/risk-insight" />
      <main className="mx-auto w-full max-w-3xl flex-grow px-5 py-8">
        <h2 className="font-headline text-3xl font-bold">Action Plan</h2>
        <p className="mt-2 text-on-surface-variant">
          Practical next steps generated from your latest rule-based
          assessment.
        </p>

        {!result || recommendations.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-surface-container p-6">
            <p className="text-on-surface-variant">
              No recommendations yet. Complete a profile assessment first.
            </p>
            <Link
              href="/privacy"
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-on-primary"
            >
              Start assessment
            </Link>
          </div>
        ) : (
          <div className="sihatq-stagger mt-8 space-y-4">
            {recommendations.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-headline text-xl font-semibold">
                    {item.title}
                  </h3>
                  <span className="rounded-full bg-primary-container/20 px-3 py-1 text-xs font-semibold text-primary">
                    {item.priority} Priority
                  </span>
                </div>
                <p className="mt-3 text-on-surface-variant">{item.description}</p>
                <p className="mt-3 text-sm font-medium text-on-secondary-container">
                  Impact: {item.impact}
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/reminders"
            className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary"
          >
            Set reminders
          </Link>
          <Link
            href="/result-detail"
            className="rounded-full border border-outline-variant px-5 py-3 font-semibold text-primary"
          >
            Full report
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-outline-variant px-5 py-3 font-semibold text-primary"
          >
            Back to Home
          </Link>
          <Link
            href="/privacy"
            className="rounded-full border border-outline-variant px-5 py-3 font-semibold text-primary"
          >
            Re-run assessment
          </Link>
        </div>
        <section className="sihatq-fade-up mt-8 overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest shadow-[var(--elevation-soft)]">
          <div className="relative h-40">
            <Image
              src={brandImages.lifestyleActions.src}
              alt={brandImages.lifestyleActions.alt}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,249,255,0.96),rgba(248,249,255,0.72),rgba(248,249,255,0.22))]" />
            <div className="absolute inset-0 flex items-center p-5">
              <div className="max-w-sm">
                <p className="font-headline text-xl font-semibold text-primary">
                  Keep the plan small enough to repeat.
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Choose one screening action and one daily habit before adding
                  more reminders.
                </p>
              </div>
            </div>
          </div>
        </section>
        <Disclaimer className="mt-8" />
      </main>
      <BottomNav />
    </div>
  );
}
