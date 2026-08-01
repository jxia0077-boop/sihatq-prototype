import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { SignUpForm } from "@/components/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader backHref="/" showAccount={false} />
      <main className="mx-auto flex w-full max-w-md flex-grow flex-col justify-center px-5 py-10">
        <section className="mb-8 text-center">
          <h2 className="font-headline text-3xl font-bold text-on-surface">
            Create your SihatQ account
          </h2>
          <p className="mt-2 text-on-surface-variant">
            We only store age group, gender, state, and lifestyle answers.
          </p>
        </section>

        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_10px_40px_-10px_rgba(0,104,95,0.08)]">
          <SignUpForm />
        </div>

        <p className="mt-6 text-center text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Log In
          </Link>
        </p>
        <Disclaimer className="mt-8" />
      </main>
    </div>
  );
}
