import Image from "next/image";
import Link from "next/link";
import { SignUpForm } from "@/components/SignUpForm";
import { brandImages } from "@/lib/brand-images";

export default function SignUpPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-surface">
      <main className="grid min-h-screen lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative flex items-center justify-center px-5 py-10">
          <div className="sihatq-soft-grid absolute inset-0 opacity-70" />
          <div className="relative w-full max-w-md">
            <Link href="/" className="mb-8 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                health_and_safety
              </span>
              <span className="font-headline text-xl font-bold text-primary">
                SihatQ
              </span>
            </Link>

            <div className="rounded-[2rem] border border-outline-variant/24 bg-surface-container-lowest/88 p-6 shadow-[var(--elevation-panel)] backdrop-blur md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Start safely
              </p>
              <h1 className="mt-2 font-headline text-3xl font-semibold">
                Create your SihatQ account
              </h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                SihatQ stores only minimal profile answers for preventive
                education, not identifying clinical records.
              </p>

              <div className="mt-8">
                <SignUpForm />
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary">
                Log in
              </Link>
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src={brandImages.heroClinician.src}
            alt={brandImages.heroClinician.alt}
            fill
            priority
            sizes="48vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,249,255,0.1),rgba(0,50,45,0.28)),linear-gradient(0deg,rgba(0,50,45,0.52),transparent_52%)]" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="font-headline text-4xl font-semibold leading-tight">
              Preventive insight, with consent first.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/82">
              Build a profile only after reading the privacy notice and
              understanding what SihatQ does not collect.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
