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
import {
  fieldErrorsFromZod,
  profileInputSchema,
  type ProfileFieldErrors,
} from "@/lib/validation";

const familyLabels: Record<FamilyHistoryOption, string> = {
  diabetes: "Diabetes",
  heart_disease: "Heart Disease",
  hypertension: "Hypertension",
  none: "None",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-2 text-sm font-medium text-error" role="alert">
      {message}
    </p>
  );
}

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
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
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
    setFieldErrors((current) => ({ ...current, family_history: undefined }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      age_group: ageGroup,
      gender,
      state,
      lifestyle,
      family_history: familyHistory,
    };

    const parsed = profileInputSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // AC 1.2.1 — send only the allowed minimal fields.
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors as ProfileFieldErrors);
        }
        setFormError(result.error || "Could not save profile.");
        return;
      }

      router.push("/analyzing");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-8 pb-10" onSubmit={onSubmit} noValidate>
      <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
        <p className="font-semibold text-on-surface">Minimal data only</p>
        <p className="mt-1">
          We ask only for age group, gender, Malaysian state, lifestyle factors,
          and broad family-history categories. There is no field for NRIC/MyKad,
          exact date of birth, name, home address, or clinic lab results /
          diagnoses.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-container p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">cake</span>
          <h3 className="font-headline text-xl font-semibold">Age Group</h3>
        </div>
        <select
          value={ageGroup}
          onChange={(e) => {
            setAgeGroup(e.target.value);
            setFieldErrors((current) => ({ ...current, age_group: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.age_group)}
          className={`w-full cursor-pointer appearance-none rounded-xl border-0 bg-white p-4 shadow-sm outline-none ring-2 ${
            fieldErrors.age_group ? "ring-error" : "ring-transparent focus:ring-primary"
          }`}
        >
          <option disabled value="">
            Select your age group
          </option>
          {AGE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.age_group} />
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">wc</span>
          <h3 className="font-headline text-xl font-semibold">Gender</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {GENDERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setGender(option);
                setFieldErrors((current) => ({
                  ...current,
                  gender: undefined,
                }));
              }}
              aria-pressed={gender === option}
              className={`min-h-16 rounded-2xl border p-5 text-center font-medium capitalize transition active:scale-[0.99] ${
                gender === option
                  ? "border-primary bg-primary-container/30"
                  : "border-outline-variant/30 bg-surface"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <FieldError message={fieldErrors.gender} />
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            monitor_heart
          </span>
          <h3 className="font-headline text-xl font-semibold">Lifestyle Habits</h3>
        </div>
        <p className="mb-4 text-sm text-on-surface-variant">
          Tick any that apply. Leaving all unticked is allowed (means none of
          these habits).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              ["smoker", "Smoker", "smoke_free"],
              ["active_exercise", "Active Exercise", "fitness_center"],
              ["high_sugar", "High Sugar", "icecream"],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setLifestyle((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              aria-pressed={lifestyle[key]}
              className={`flex min-h-36 flex-col items-center justify-center rounded-2xl border p-6 transition active:scale-[0.99] ${
                lifestyle[key]
                  ? "border-primary bg-primary-container/20"
                  : "border-outline-variant/30 bg-surface"
              }`}
            >
              <span className="material-symbols-outlined mb-3 text-[40px] text-primary">
                {icon}
              </span>
              <span className="text-center text-sm font-medium">{label}</span>
              <span
                className={`mt-3 h-2 w-2 rounded-full ${
                  lifestyle[key] ? "bg-primary" : "bg-outline-variant"
                }`}
              />
            </button>
          ))}
        </div>
        <FieldError message={fieldErrors.lifestyle} />
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            family_history
          </span>
          <h3 className="font-headline text-xl font-semibold">Family History</h3>
        </div>
        <p className="mb-4 text-sm text-on-surface-variant">
          Broad condition categories only. Do not name the relative, and do not
          provide clinical details about them.
        </p>
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
                    : fieldErrors.family_history
                      ? "border-error"
                      : "border-outline-variant"
                }`}
              >
                {familyLabels[option]}
              </button>
            );
          })}
        </div>
        <FieldError message={fieldErrors.family_history} />
      </section>

      <section className="rounded-2xl bg-surface-container p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            location_on
          </span>
          <h3 className="font-headline text-xl font-semibold">
            Malaysian State
          </h3>
        </div>
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setFieldErrors((current) => ({ ...current, state: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.state)}
          className={`w-full cursor-pointer appearance-none rounded-xl border-0 bg-white p-4 shadow-sm outline-none ring-2 ${
            fieldErrors.state ? "ring-error" : "ring-transparent focus:ring-primary"
          }`}
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
        <FieldError message={fieldErrors.state} />
      </section>

      {formError ? (
        <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {formError}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-on-primary shadow-lg transition hover:bg-primary-container active:scale-95 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Next: See My Results"}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </form>
  );
}
