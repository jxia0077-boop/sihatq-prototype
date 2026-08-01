"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";

export default function AnalyzingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          clearInterval(timer);
          return 100;
        }
        return value + 5;
      });
    }, 80);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    const redirectTimer = setTimeout(() => {
      router.push("/risk-insight");
    }, 400);
    return () => clearTimeout(redirectTimer);
  }, [progress, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader backHref="/profile" showAccount={false} />
      <main className="mx-auto flex w-full max-w-md flex-grow flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-container/30">
          <span className="material-symbols-outlined animate-pulse text-4xl text-primary">
            cardiology
          </span>
        </div>
        <h2 className="font-headline text-3xl font-bold">Analyzing profile</h2>
        <p className="mt-3 text-on-surface-variant">
          Matching your answers with NHMS reference stats and rule-based
          recommendations...
        </p>
        <div className="mt-8 h-3 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold text-primary">{progress}%</p>
        <Disclaimer className="mt-10" />
      </main>
    </div>
  );
}
