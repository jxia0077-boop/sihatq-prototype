import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-surface shadow-sm">
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
            <Link
              href="/"
              className="rounded-full bg-secondary-container/50 px-4 py-2 text-sm font-medium text-primary"
            >
              Home
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-12">
        <section className="relative grid items-center gap-10 overflow-hidden rounded-3xl py-8 lg:grid-cols-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_30%,rgba(0,104,95,0.08),transparent_60%)]" />

          <div className="z-10 flex flex-col items-start gap-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-4 py-1.5 text-xs font-semibold text-on-secondary-container">
              <span className="material-symbols-outlined text-[18px]">
                verified_user
              </span>
              Kementerian Kesihatan Standard
            </div>

            <h1 className="font-headline text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-[56px] lg:leading-[64px]">
              SihatQ: Know Your{" "}
              <span className="text-primary">Health Risks</span> Today
            </h1>

            <p className="max-w-xl text-lg text-on-surface-variant">
              A personalised health insight platform tailored for Malaysians.
              Gain professional clarity using our rule-based assessment in under
              60 seconds.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="#features"
                className="rounded-full border-2 border-outline-variant px-8 py-4 font-headline text-lg font-semibold text-on-surface-variant transition hover:bg-surface-container"
              >
                Learn More
              </a>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-headline text-lg font-semibold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-primary-container active:scale-95"
              >
                Start Assessment
                <span className="material-symbols-outlined">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="mt-8 w-full border-t border-outline-variant/30 pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant opacity-70">
                Trusted by 50,000+ Malaysians
              </p>
              <div className="flex flex-wrap gap-6 text-xl font-bold tracking-tighter text-on-surface/50 grayscale transition hover:grayscale-0">
                <span>KLHealth</span>
                <span>MyWellness</span>
                <span>MedCity</span>
              </div>
            </div>
          </div>

          <div className="relative flex h-[400px] items-center justify-center lg:col-span-5 lg:h-[600px]">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5 blur-3xl" />
            <div className="relative z-10 h-full w-full overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB8MX5IrV24GUbiqSd0gbTmzsptf3mHKddWJuOlj9lRrkVRXC5ClCie54oAT_jCvqprZzvyot9SmDE9g7wXZCOc-iu-ANGU_UIhcYbZG58DDqbQt-RCe_FnErhEgd43k2xnmUosk7btHFfNjtwzKVqGZLzLIXbT0NDMAO7C4eHzjNxIFfdmLgBgblffS05_EN7yTXNwCAAlcR2RMCZST9jdz5dY9yRoZZK-dqPXcG_ReJLSCtMAbeI7')",
                }}
              />
              <div className="absolute -left-2 top-8 rounded-2xl border border-primary/10 bg-surface-container-lowest p-4 shadow-xl md:-left-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <span className="material-symbols-outlined text-[20px]">
                      monitor_heart
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Heart Score</p>
                    <p className="font-bold text-primary">Excellent</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-2 bottom-12 rounded-2xl border border-primary/10 bg-surface-container-lowest p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined text-[20px]">
                      shield
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Security</p>
                    <p className="font-bold">PDPA Compliant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16" id="features">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-headline text-3xl font-semibold">
              Engineered for Your Well-being
            </h2>
            <p className="mt-3 text-lg text-on-surface-variant">
              Our platform combines medical expertise with data science to
              provide insights you can trust.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-3xl border border-transparent bg-surface-container-low p-8 transition hover:-translate-y-1 hover:border-primary/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
                <span className="material-symbols-outlined text-[32px]">timer</span>
              </div>
              <h3 className="font-headline text-xl font-semibold">1-min check</h3>
              <p className="text-on-surface-variant">
                Rapid screening technology designed for busy lifestyles. Get your
                results before your morning coffee is ready.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl bg-primary-container p-8 text-on-primary-container transition hover:-translate-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-on-primary-container text-primary">
                <span className="material-symbols-outlined text-[32px]">
                  analytics
                </span>
              </div>
              <h3 className="font-headline text-xl font-semibold">Data-driven</h3>
              <p className="opacity-90">
                Validated by clinical research and localized for the Malaysian
                demographic profile for superior accuracy.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-transparent bg-surface-container-low p-8 transition hover:-translate-y-1 hover:border-primary/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-white">
                <span className="material-symbols-outlined text-[32px]">lock</span>
              </div>
              <h3 className="font-headline text-xl font-semibold">
                Private & Secure
              </h3>
              <p className="text-on-surface-variant">
                Your health data is encrypted end-to-end. We adhere to strict
                PDPA regulations to keep your identity safe.
              </p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-[#213145] p-8 text-[#eaf1ff] md:p-12">
          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-1">
              <h2 className="font-headline text-3xl font-semibold">
                Ready to take the first step?
              </h2>
              <p className="mt-3 max-w-xl text-lg opacity-80">
                Join thousands of Malaysians who are taking control of their
                health journey with SihatQ. No blood tests required for the
                initial assessment.
              </p>
              <div className="mt-6 grid max-w-md grid-cols-2 gap-3 text-sm">
                {[
                  "Personalized Plan",
                  "Local Specialists",
                  "Zero Cost",
                  "PDF Report",
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
          </div>
        </section>

        <Disclaimer className="mt-10" />
      </main>

      <footer className="mt-8 border-t border-outline-variant/20 bg-surface-container-low py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 md:grid-cols-4 md:px-12">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                health_and_safety
              </span>
              <span className="font-headline text-xl font-bold text-primary">
                SihatQ
              </span>
            </div>
            <p className="text-xs text-on-surface-variant opacity-80">
              Empowering Malaysians through accessible health intelligence and
              proactive care management.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Platform</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li>
                <Link href="/profile" className="hover:text-primary">
                  Assessment
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary">
                  Health Records
                </Link>
              </li>
              <li>
                <Link href="/risk-insight" className="hover:text-primary">
                  Risk Indicators
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Resources</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/recommendations" className="hover:text-primary">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Connect</h4>
            <div className="flex gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-primary">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-primary">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </span>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-7xl px-4 text-center text-xs text-on-surface-variant opacity-60 md:px-12">
          © 2024 SihatQ Healthcare Malaysia. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
