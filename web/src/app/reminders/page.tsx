"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";

type ReminderKey = "steps" | "water" | "screening";

export default function RemindersPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<ReminderKey, boolean>>({
    steps: true,
    water: true,
    screening: false,
  });
  const [stepsTime, setStepsTime] = useState("09:00");
  const [waterFreq, setWaterFreq] = useState("Every 2 hours");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: ReminderKey) {
    setEnabled((current) => ({ ...current, [key]: !current[key] }));
  }

  async function saveReminders() {
    setSaving(true);
    setSaved(false);
    // MVP: local-only preferences for demo UX (no extra DB table yet)
    const payload = {
      enabled,
      stepsTime,
      waterFreq,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem("sihatq-reminders", JSON.stringify(payload));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push("/dashboard"), 700);
  }

  return (
    <div className="flex min-h-screen flex-col pb-36">
      <AppHeader backHref="/recommendations" />
      <main className="mx-auto w-full max-w-xl flex-grow space-y-6 px-5 py-8">
        <section className="text-center md:text-left">
          <h2 className="font-headline text-3xl font-semibold">Action Reminders</h2>
          <p className="mt-2 text-on-surface-variant">
            Small steps lead to big changes. Set nudges to stay on track with
            your health goals.
          </p>
        </section>

        <article className="rounded-2xl border border-secondary-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#89f5e7]">
                <span className="material-symbols-outlined text-2xl text-[#00201d]">
                  directions_walk
                </span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-semibold">Daily Steps</h3>
                <p className="text-sm text-on-surface-variant">
                  Stay active throughout the day
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle("steps")}
              className={`relative h-6 w-11 rounded-full transition ${
                enabled.steps ? "bg-primary" : "bg-secondary-container"
              }`}
              aria-pressed={enabled.steps}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  enabled.steps ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
          <div
            className={`mt-6 border-t border-outline-variant pt-6 ${
              enabled.steps ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Reminder time
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="time"
                value={stepsTime}
                onChange={(e) => setStepsTime(e.target.value)}
                className="rounded-lg border-none bg-surface-container px-3 py-2 font-medium text-primary outline-none ring-2 ring-transparent focus:ring-primary"
              />
              <span className="text-sm text-on-surface-variant">Every day</span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-secondary-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#dae2fd]">
                <span className="material-symbols-outlined text-2xl text-[#131b2e]">
                  water_drop
                </span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-semibold">Water Intake</h3>
                <p className="text-sm text-on-surface-variant">
                  Keep your body hydrated
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle("water")}
              className={`relative h-6 w-11 rounded-full transition ${
                enabled.water ? "bg-primary" : "bg-secondary-container"
              }`}
              aria-pressed={enabled.water}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  enabled.water ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
          <div
            className={`mt-6 border-t border-outline-variant pt-6 ${
              enabled.water ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Frequency
            </p>
            <select
              value={waterFreq}
              onChange={(e) => setWaterFreq(e.target.value)}
              className="mt-2 w-full rounded-lg border-none bg-surface-container px-3 py-2 outline-none ring-2 ring-transparent focus:ring-primary"
            >
              <option>Every 2 hours</option>
              <option>Every 3 hours</option>
              <option>Morning & Afternoon</option>
            </select>
          </div>
        </article>

        <article className="rounded-2xl border border-secondary-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container">
                <span className="material-symbols-outlined text-2xl text-on-secondary-container">
                  medical_services
                </span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-semibold">
                  Health Screenings
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Annual checkups and clinic visits
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle("screening")}
              className={`relative h-6 w-11 rounded-full transition ${
                enabled.screening ? "bg-primary" : "bg-secondary-container"
              }`}
              aria-pressed={enabled.screening}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  enabled.screening ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
          <div
            className={`mt-6 border-t border-outline-variant pt-6 ${
              enabled.screening ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <div className="flex items-center justify-between rounded-xl bg-surface-container p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">
                  event
                </span>
                <span className="text-sm font-medium">Next general checkup</span>
              </div>
              <span className="text-sm font-semibold text-primary">Plan soon</span>
            </div>
            <p className="mt-2 text-xs italic text-on-surface-variant">
              Demo reminder only — activate to remember screening goals.
            </p>
          </div>
        </article>

        <div className="flex items-center gap-4 rounded-2xl bg-primary/5 p-5">
          <div>
            <h4 className="font-headline font-semibold text-primary">
              You&apos;re doing great!
            </h4>
            <p className="mt-1 text-sm text-on-surface-variant">
              Users who set regular reminders are more likely to stick with
              walking and hydration habits.
            </p>
          </div>
        </div>

        <Disclaimer />
      </main>

      <div className="fixed bottom-16 left-0 z-40 w-full bg-surface-container-lowest/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={saveReminders}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-lg font-semibold text-on-primary shadow-lg transition active:scale-95 disabled:opacity-70"
          >
            {saving
              ? "Saving..."
              : saved
                ? "Saved successfully!"
                : "Save Reminders"}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
