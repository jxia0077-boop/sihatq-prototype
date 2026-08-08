"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!accepted) {
      setError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setMessage(
          "Account created. If email confirmation is enabled in Supabase, check your inbox, then log in.",
        );
        return;
      }

      router.push("/privacy");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-1">
        <label
          className="ml-1 text-sm font-medium text-on-surface-variant"
          htmlFor="fullName"
        >
          Full name
        </label>
        <input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Aisha Rahman"
          className="w-full rounded-xl border-none bg-secondary-container/30 px-4 py-4 text-on-surface outline-none ring-2 ring-transparent transition focus:bg-surface focus:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label
          className="ml-1 text-sm font-medium text-on-surface-variant"
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full rounded-xl border-none bg-secondary-container/30 px-4 py-4 text-on-surface outline-none ring-2 ring-transparent transition focus:bg-surface focus:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label
          className="ml-1 text-sm font-medium text-on-surface-variant"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className="w-full rounded-xl border-none bg-secondary-container/30 px-4 py-4 text-on-surface outline-none ring-2 ring-transparent transition focus:bg-surface focus:ring-primary"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/24 bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-on-surface-variant transition hover:border-primary/35">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
        />
        <span>
          I agree to the terms and understand SihatQ stores only age group,
          gender, state, and lifestyle answers — not NRIC or exact birthday.
        </span>
      </label>

      {error ? (
        <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-headline text-lg text-on-primary transition hover:-translate-y-0.5 hover:shadow-[var(--elevation-soft)] active:scale-95 disabled:translate-y-0 disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
