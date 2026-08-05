import { z } from "zod";
import {
  AGE_GROUPS,
  FAMILY_HISTORY_OPTIONS,
  GENDERS,
  STATES,
} from "@/lib/types";

/** Keys that must never be accepted on the profile payload (AC 1.2.1 / 1.2.4). */
export const FORBIDDEN_PROFILE_KEYS = [
  "nric",
  "mykad",
  "my_kad",
  "ic",
  "name",
  "full_name",
  "fullName",
  "email",
  "phone",
  "address",
  "home_address",
  "date_of_birth",
  "dob",
  "birthday",
  "lab_results",
  "laboratory",
  "diagnosis",
  "diagnoses",
  "clinic",
  "relative_name",
  "relative",
] as const;

export const profileInputSchema = z
  .object({
    age_group: z.enum(AGE_GROUPS, {
      message: "Please select a valid age group.",
    }),
    gender: z.enum(GENDERS, {
      message: "Please select gender (male or female).",
    }),
    state: z.enum(STATES, {
      message: "Please select a Malaysian state.",
    }),
    lifestyle: z.object(
      {
        smoker: z.boolean(),
        active_exercise: z.boolean(),
        high_sugar: z.boolean(),
      },
      { message: "Lifestyle answers are required." },
    ),
    family_history: z
      .array(z.enum(FAMILY_HISTORY_OPTIONS))
      .min(1, "Please select at least one family history option."),
  })
  .superRefine((data, ctx) => {
    const hasNone = data.family_history.includes("none");
    const hasCondition = data.family_history.some((item) => item !== "none");
    if (hasNone && hasCondition) {
      ctx.addIssue({
        code: "custom",
        message: 'Choose either "None" or specific conditions, not both.',
        path: ["family_history"],
      });
    }
  });

export type ValidatedProfileInput = z.infer<typeof profileInputSchema>;

export type ProfileFieldErrors = Partial<
  Record<
    "age_group" | "gender" | "state" | "lifestyle" | "family_history" | "form",
    string
  >
>;

export function findForbiddenProfileKeys(body: unknown): string[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const keys = Object.keys(body as Record<string, unknown>);
  const forbidden = new Set(
    FORBIDDEN_PROFILE_KEYS.map((k) => k.toLowerCase()),
  );
  return keys.filter((key) => forbidden.has(key.toLowerCase()));
}

export function fieldErrorsFromZod(
  error: z.ZodError,
): ProfileFieldErrors {
  const out: ProfileFieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] || "form") as keyof ProfileFieldErrors;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
