export type SkillPack = {
  id: string;
  title: string;
  /** Extra system instructions when skill is active. */
  systemAppendix: string;
  /** Allowed tool names (subset). */
  tools: string[];
  /** Keyword triggers (lowercase). */
  triggers: string[];
};

/**
 * Skill packs (P3). Embedded catalog so it works on Vercel without reading disk.
 * Mirror docs also live under web/skills/<pack>/ for humans.
 */
export const SKILL_PACKS: SkillPack[] = [
  {
    id: "preventive-diabetes",
    title: "Preventive diabetes education",
    triggers: [
      "diabetes",
      "diabet",
      "glucose",
      "sugar",
      "血糖",
      "糖尿病",
      "metabolic",
    ],
    tools: [
      "get_user_risk",
      "search_knowledge",
      "get_reference_stat",
      "list_recommendations",
    ],
    systemAppendix: `Skill: preventive-diabetes
- Focus on metabolic / diabetes-related preventive education using NHMS context.
- Never diagnose diabetes or prescribe medicines.
- Prefer calm wording; emphasise screening questions for a clinician, not home treatment.`,
  },
  {
    id: "screening-navigation",
    title: "Screening navigation",
    triggers: [
      "screening",
      "screen",
      "check-up",
      "checkup",
      "clinic",
      "筛查",
      "检查",
      "体检",
    ],
    tools: ["get_user_risk", "list_recommendations", "search_knowledge"],
    systemAppendix: `Skill: screening-navigation
- Help the user think about what preventive screening topics to discuss with a qualified provider.
- Do not book appointments, interpret lab results, or give diagnostic conclusions.
- Keep next steps practical and Malaysia-context friendly.`,
  },
  {
    id: "general-prevention",
    title: "General prevention",
    triggers: [],
    tools: [
      "get_user_risk",
      "search_knowledge",
      "get_reference_stat",
      "list_recommendations",
    ],
    systemAppendix: `Skill: general-prevention
- General SihatQ preventive education.
- Stay within public stats + assessment context; no diagnosis.`,
  },
];

export function routeSkill(question: string): SkillPack {
  const q = question.toLowerCase();
  for (const pack of SKILL_PACKS) {
    if (!pack.triggers.length) continue;
    if (pack.triggers.some((t) => q.includes(t))) return pack;
  }
  return (
    SKILL_PACKS.find((p) => p.id === "general-prevention") || SKILL_PACKS[0]
  );
}
