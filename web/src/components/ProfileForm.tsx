"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AGE_GROUPS,
  FAMILY_HISTORY_OPTIONS,
  GENDERS,
  STATES,
  type FamilyHistoryOption,
  type Lifestyle,
} from "@/lib/types";

const familyLabels: Record<FamilyHistoryOption, string> = {
  diabetes: "Diabetes",
  heart_disease: "Heart Disease",
  hypertension: "Hypertension",
  none: "None",
};

export function ProfileForm() {
  const router = useRouter();
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [state, setState] = useState("");
  const [lifestyle, setLifestyle] = useState<Lifestyle>({
    smoker: false,
    active_exercise: false,
    high_sugar: false,
  });
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleFamily(option: FamilyHistoryOption) {
    setFamilyHistory((current) => {
      if (option === "none") {
        return current.includes("none") ? [] : ["none"];
      }
      const withoutNone = current.filter((item) => item !== "none");
      if (withoutNone.includes(option)) {
        return withoutNone.filter((item) => item !== option);
      }
      return [...withoutNone, option];
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age_group: ageGroup,
          gender,
          state,
          lifestyle,
          family_history: familyHistory,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Could not save profile.");
        return;
      }

      router.push("/analyzing");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      <section className="rounded-2xl bg-surface-container p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">cake</span>
          <h3 className="font-headline text-xl font-semibold">Age Group</h3>
        </div>
        <select
          required
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border-0 bg-white p-4 shadow-sm outline-none ring-2 ring-transparent focus:ring-primary"
        >
          <option disabled value="">
            Select your age
          </option>
          {AGE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">wc</span>
          <h3 className="font-headline text-xl font-semibold">Gender</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {GENDERS.map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-2xl border p-5 text-center transition ${
                gender === option
                  ? "border-primary bg-primary-container/30"
                  : "border-outline-variant/30 bg-surface"
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={option}
                required
                checked={gender === option}
                onChange={() => setGender(option)}
                className="sr-only"
              />
              <span className="font-medium capitalize">{option}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            monitor_heart
          </span>
          <h3 className="font-headline text-xl font-semibold">Lifestyle Habits</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              ["smoker", "Smoker", "smoke_free"],
              ["active_exercise", "Active Exercise", "fitness_center"],
              ["high_sugar", "High Sugar", "icecream"],
            ] as const
          ).map(([key, label, icon]) => (
            <label
              key={key}
              className={`relative flex cursor-pointer flex-col items-center rounded-2xl border p-6 transition ${
                lifestyle[key]
                  ? "border-primary bg-primary-container/20"
                  : "border-outline-variant/30 bg-surface"
              }`}
            >
              <input
                type="checkbox"
                checked={lifestyle[key]}
                onChange={(e) =>
                  setLifestyle((current) => ({
                    ...current,
                    [key]: e.target.checked,
                  }))
                }
                className="absolute right-4 top-4 h-5 w-5 rounded border-outline text-primary focus:ring-primary"
              />
              <span className="material-symbols-outlined mb-3 text-[40px] text-primary">
                {icon}
              </span>
              <span className="text-center text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            family_history
          </span>
          <h3 className="font-headline text-xl font-semibold">Family History</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {FAMILY_HISTORY_OPTIONS.map((option) => {
            const selected = familyHistory.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleFamily(option)}
                className={`rounded-full border px-6 py-3 text-sm transition active:scale-95 ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-outline-variant"
                }`}
              >
                {familyLabels[option]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-container p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            location_on
          </span>
          <h3 className="font-headline text-xl font-semibold">Location</h3>
        </div>
        <select
          required
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border-0 bg-white p-4 shadow-sm outline-none ring-2 ring-transparent focus:ring-primary"
        >
          <option disabled value="">
            Select State
          </option>
          {STATES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 border-t border-outline-variant/20 bg-surface-container-lowest p-4 shadow-[0_-4px_20px_0_rgba(0,106,97,0.05)] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button
          type="submit"
          disabled={loading || familyHistory.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-on-primary shadow-lg transition hover:bg-primary-container active:scale-95 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Next: See My Results"}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </form>
  );
}
