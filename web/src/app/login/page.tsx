import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { brandImages } from "@/lib/brand-images";

export default function LoginPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-surface">
      <main className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src={brandImages.clinicInterior.src}
            alt={brandImages.clinicInterior.alt}
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,50,45,0.68),rgba(0,50,45,0.16)),linear-gradient(0deg,rgba(0,50,45,0.5),transparent_48%)]" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="font-headline text-4xl font-semibold leading-tight">
              Welcome back to SihatQ.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/82">
              Continue your preventive-health workflow, review insights, or
              access the admin console if your account is authorised.
            </p>
          </div>
        </section>

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
                Secure sign in
              </p>
              <h1 className="mt-2 font-headline text-3xl font-semibold">
                Log in to your account
              </h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Use the same email you used for SihatQ. Admin access is granted
                by role or configured allowlist.
              </p>

              <div className="mt-8">
                <Suspense>
                  <LoginForm />
                </Suspense>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-on-surface-variant">
              New to SihatQ?{" "}
              <Link href="/sign-up" className="font-semibold text-primary">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
