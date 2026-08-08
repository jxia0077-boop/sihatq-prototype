import Image from "next/image";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { brandImages } from "@/lib/brand-images";

const trustSignals = [
  {
    title: "Minimal profile",
    copy: "Age range, state, lifestyle, and broad family history only.",
  },
  {
    title: "Malaysia context",
    copy: "Results are framed with public Malaysian health references.",
  },
  {
    title: "Education first",
    copy: "Clear preventive guidance, never a clinical diagnosis.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-surface text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/20 bg-surface/88 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary">
              health_and_safety
            </span>
            <span className="font-headline text-xl font-bold text-primary">
              SihatQ
            </span>
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-[0_12px_28px_rgba(0,104,95,0.22)] transition hover:bg-primary-container"
          >
            Start
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative isolate min-h-[calc(100svh-68px)] overflow-hidden border-b border-outline-variant/20">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_16%_12%,rgba(0,131,120,0.14),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(140,239,225,0.2),transparent_34%)]" />
          <div className="sihatq-soft-grid absolute inset-0 -z-10" />

          <div className="mx-auto grid min-h-[calc(100svh-68px)] max-w-7xl items-center gap-10 px-4 py-14 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="sihatq-fade-up max-w-3xl">
              <h1 className="font-headline text-[clamp(4.5rem,15vw,10rem)] font-bold leading-[0.86] text-primary">
                SihatQ
              </h1>
              <p className="mt-7 max-w-2xl font-headline text-3xl font-semibold leading-tight md:text-5xl">
                Know your health risks before they become urgent.
              </p>
              <p className="mt-5 max-w-xl text-lg leading-8 text-on-surface-variant">
                A Malaysian preventive-health insight app that turns a short,
                non-identifying profile into clear risk context and practical
                next steps.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/privacy"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 font-headline text-base font-semibold text-on-primary shadow-[0_18px_42px_rgba(0,104,95,0.26)] transition hover:bg-primary-container"
                >
                  Start Assessment
                  <span className="material-symbols-outlined text-[20px]">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-primary/25 bg-surface-container-lowest/72 px-7 py-3 font-headline text-base font-semibold text-primary shadow-[0_14px_32px_rgba(11,28,48,0.08)] backdrop-blur transition hover:border-primary/45"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="sihatq-fade-up sihatq-delay-1 relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/70 bg-surface-container-lowest shadow-[var(--elevation-panel)] md:min-h-[520px]">
              <Image
                src={brandImages.heroClinician.src}
                alt={brandImages.heroClinician.alt}
                fill
                priority
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,249,255,0.12),transparent_42%),linear-gradient(0deg,rgba(0,80,73,0.22),transparent_45%)]" />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest/75 px-4 py-10 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3 md:gap-0">
            {trustSignals.map((item, index) => (
              <div
                key={item.title}
                className={`sihatq-fade-up md:px-8 ${
                  index === 0 ? "md:pl-0" : ""
                } ${index > 0 ? "md:border-l md:border-outline-variant/20" : ""}`}
              >
                <p className="font-headline text-base font-semibold text-primary">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 md:px-8 md:py-24" id="features">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="font-headline text-3xl font-semibold leading-tight md:text-5xl">
                A quieter way to move from concern to action.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-on-surface-variant">
                SihatQ avoids alarmist scoring. It explains the signal, gives
                local context, and helps you prepare better screening questions.
              </p>
            </div>
            <div className="sihatq-stagger space-y-6">
              {[
                ["assignment", "Consent first", "No profile questions appear until the privacy notice is accepted."],
                ["monitor_heart", "Rule-based insight", "Scores are transparent and tied to your own non-identifying answers."],
                ["forum", "AI follow-up", "Ask safer questions and approve plans before tools run."],
              ].map(([icon, title, copy]) => (
                <div
                  key={title}
                  className="grid gap-4 border-t border-outline-variant/25 pt-6 sm:grid-cols-[56px_1fr]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">{icon}</span>
                  </span>
                  <div>
                    <h3 className="font-headline text-xl font-semibold">
                      {title}
                    </h3>
                    <p className="mt-2 leading-7 text-on-surface-variant">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
          <Disclaimer />
        </section>
      </main>
    </div>
  );
}
