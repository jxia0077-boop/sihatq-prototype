import Link from "next/link";
import { signOut } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: latestRisk } = await supabase
    .from("risk_results")
    .select("risk_category, risk_level, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-grow px-5 py-8">
        <h2 className="font-headline text-3xl font-bold">
          Hello{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
        </h2>
        <p className="mt-2 text-on-surface-variant">
          Start a preventive assessment using your profile and Malaysia NHMS
          reference stats.
        </p>

        <div className="mt-8 rounded-3xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary shadow-lg">
          <p className="text-sm uppercase tracking-wide opacity-90">
            Next step
          </p>
          <h3 className="mt-2 font-headline text-2xl font-semibold">
            Complete your health profile
          </h3>
          <p className="mt-2 max-w-md text-sm opacity-90">
            Age group, lifestyle, family history, and state — no NRIC required.
          </p>
          <Link
            href="/privacy"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-primary"
          >
            Begin assessment
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </div>

        {latestRisk ? (
          <div className="mt-6 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
            <p className="text-sm font-semibold uppercase text-on-surface-variant">
              Latest insight
            </p>
            <p className="mt-2 font-headline text-xl font-semibold">
              {latestRisk.risk_level} · {latestRisk.risk_category}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-primary">
              <Link href="/risk-insight" className="hover:underline">
                View risk insight
              </Link>
              <Link href="/result-detail" className="hover:underline">
                Full report
              </Link>
              <Link href="/reminders" className="hover:underline">
                Reminders
              </Link>
            </div>
          </div>
        ) : null}

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="text-sm font-medium text-on-surface-variant hover:text-primary"
          >
            Sign out
          </button>
        </form>
        <Disclaimer className="mt-8" />
      </main>
      <BottomNav />
    </div>
  );
}
