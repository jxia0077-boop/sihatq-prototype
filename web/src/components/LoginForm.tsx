"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-1">
        <label className="ml-1 text-sm font-medium text-on-surface-variant" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            mail
          </span>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-xl border-none bg-secondary-container/30 py-4 pl-12 pr-4 text-on-surface outline-none ring-2 ring-transparent transition focus:bg-surface focus:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="ml-1 text-sm font-medium text-on-surface-variant" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            lock
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border-none bg-secondary-container/30 py-4 pl-12 pr-12 text-on-surface outline-none ring-2 ring-transparent transition focus:bg-surface focus:ring-primary"
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-headline text-lg text-on-primary shadow-[0_10px_40px_-10px_rgba(0,104,95,0.08)] transition active:scale-95 disabled:opacity-60"
      >
        <span>{loading ? "Signing in..." : "Log In"}</span>
        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
      </button>
    </form>
  );
}
