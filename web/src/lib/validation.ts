import { z } from "zod";
import {
  AGE_GROUPS,
  FAMILY_HISTORY_OPTIONS,
  GENDERS,
  STATES,
} from "@/lib/types";

export const profileInputSchema = z
  .object({
    age_group: z.enum(AGE_GROUPS),
    gender: z.enum(GENDERS),
    state: z.enum(STATES),
    lifestyle: z.object({
      smoker: z.boolean(),
      active_exercise: z.boolean(),
      high_sugar: z.boolean(),
    }),
    family_history: z.array(z.enum(FAMILY_HISTORY_OPTIONS)).min(1),
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
