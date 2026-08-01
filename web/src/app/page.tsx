import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-outline-variant/20 bg-surface/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary">
              health_and_safety
            </span>
            <span className="font-headline text-xl font-bold text-primary">
              SihatQ
            </span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <a
              href="#features"
              className="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-secondary-container/50"
            >
              Features
            </a>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-secondary-container/50"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
            >
              Get started
            </Link>
          </div>
          <Link
            href="/login"
            className="material-symbols-outlined text-primary md:hidden"
            aria-label="Log in"
          >
            account_circle
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-12 md:py-16">
        <section className="relative grid items-center gap-10 overflow-hidden rounded-3xl py-6 lg:grid-cols-12 lg:gap-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_30%,rgba(0,104,95,0.12),transparent_55%)]" />

          <div className="z-10 flex flex-col items-start gap-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-4 py-1.5 text-xs font-semibold text-on-secondary-container">
              <span className="material-symbols-outlined text-[18px]">
                verified_user
              </span>
              Preventive insight · NHMS comparison
            </div>

            <h1 className="font-headline text-4xl font-bold leading-tight tracking-tight text-on-surface md:text-5xl lg:text-[56px] lg:leading-[64px]">
              SihatQ: Know Your{" "}
              <span className="text-primary">Health Risks</span> Today
            </h1>

            <p className="max-w-xl text-lg text-on-surface-variant">
              A personalised preventive insight platform for Malaysians. Answer a
              short profile, compare with public NHMS statistics, and get
              rule-based recommendations in under a minute.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-headline text-lg font-semibold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-primary-container active:scale-95"
              >
                Start Free Assessment
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <a
                href="#features"
                className="rounded-full border-2 border-outline-variant px-8 py-4 font-headline text-lg font-semibold text-on-surface-variant transition hover:bg-surface-container"
              >
                Learn More
              </a>
            </div>

            <div className="mt-8 w-full border-t border-outline-variant/30 pt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant opacity-70">
                Built with open Malaysia health reference data
              </p>
              <div className="flex flex-wrap gap-6 text-lg font-bold tracking-tight text-on-surface/50">
                <span>NHMS 2023</span>
                <span>PDPA-aware</span>
                <span>No NRIC stored</span>
              </div>
            </div>
          </div>

          <div className="relative flex h-[360px] items-center justify-center lg:col-span-5 lg:h-[520px]">
            <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative z-10 h-full w-full overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB8MX5IrV24GUbiqSd0gbTmzsptf3mHKddWJuOlj9lRrkVRXC5ClCie54oAT_jCvqprZzvyot9SmDE9g7wXZCOc-iu-ANGU_UIhcYbZG58DDqbQt-RCe_FnErhEgd43k2xnmUosk7btHFfNjtwzKVqGZLzLIXbT0NDMAO7C4eHzjNxIFfdmLgBgblffS05_EN7yTXNwCAAlcR2RMCZST9jdz5dY9yRoZZK-dqPXcG_ReJLSDtMAbeI7')",
                }}
              />
              <div className="absolute left-4 top-8 rounded-2xl border border-primary/10 bg-surface-container-lowest p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <span className="material-symbols-outlined text-[20px]">
                      monitor_heart
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Risk check</p>
                    <p className="font-bold text-primary">Rule-based</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-10 right-4 rounded-2xl border border-primary/10 bg-surface-container-lowest p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined text-[20px]">
                      shield
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Security</p>
                    <p className="font-bold text-on-surface">PDPA mindful</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16" id="features">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-headline text-3xl font-semibold text-on-surface">
              Engineered for your well-being
            </h2>
            <p className="mt-3 text-lg text-on-surface-variant">
              Profile answers + public NHMS stats + clear rules — insights you
              can explain in a presentation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: "timer",
                title: "1-min check",
                body: "Rapid screening designed for busy lifestyles. Get an insight before your coffee cools.",
                tone: "light",
              },
              {
                icon: "analytics",
                title: "Data-informed",
                body: "National NHMS 2023 reference rates for diabetes, hypertension, cholesterol, and obesity.",
                tone: "primary",
              },
              {
                icon: "lock",
                title: "Private & secure",
                body: "We store age group, gender, state, and lifestyle chips — not NRIC or exact birthday.",
                tone: "light",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={
                  item.tone === "primary"
                    ? "flex flex-col gap-4 rounded-3xl bg-primary-container p-8 text-on-primary-container transition hover:-translate-y-1"
                    : "flex flex-col gap-4 rounded-3xl border border-transparent bg-surface-container-low p-8 transition hover:-translate-y-1 hover:border-primary/20"
                }
              >
                <div
                  className={
                    item.tone === "primary"
                      ? "flex h-14 w-14 items-center justify-center rounded-2xl bg-on-primary-container text-primary"
                      : "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white"
                  }
                >
                  <span className="material-symbols-outlined text-[32px]">
                    {item.icon}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 font-headline text-xl font-semibold">
                    {item.title}
                  </h3>
                  <p className={item.tone === "primary" ? "opacity-90" : "text-on-surface-variant"}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-[#213145] p-8 text-[#eaf1ff] md:p-12">
          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-1">
              <h2 className="font-headline text-3xl font-semibold">
                Ready to take the first step?
              </h2>
              <p className="mt-3 max-w-xl text-lg opacity-80">
                No blood tests required for the initial assessment. This is
                preventive insight only — not a medical diagnosis.
              </p>
              <div className="mt-6 grid max-w-md grid-cols-2 gap-3 text-sm">
                {[
                  "Personalised plan",
                  "NHMS comparison",
                  "Zero cost MVP",
                  "Rule-based report",
                ].map((label) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#89f5e7]">
                      check_circle
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/sign-up"
              className="inline-flex rounded-full bg-[#89f5e7] px-10 py-5 font-headline text-lg font-semibold text-[#00201d] shadow-xl transition hover:scale-105"
            >
              Start Assessment Now
            </Link>
          </div>
        </section>

        <Disclaimer className="mt-10" />
      </main>
    </div>
  );
}
