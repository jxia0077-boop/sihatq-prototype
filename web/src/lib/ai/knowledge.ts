export type KnowledgeChunk = {
  id: string;
  title: string;
  tags: string[];
  content: string;
  source: string;
};

/** Lightweight knowledge base for demo RAG (no vector DB required). */
export const HEALTH_KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: "nhms-diabetes",
    title: "NHMS 2023 Diabetes",
    tags: ["diabetes", "metabolic", "sugar", "glucose", "screening", "blood"],
    content:
      "NHMS 2023 Key Findings: about 15.6% of Malaysian adults have diabetes. Higher age and family history of diabetes are common risk signals. Preventive actions include blood glucose screening and reducing sugary drinks.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "nhms-hypertension",
    title: "NHMS 2023 Hypertension",
    tags: ["hypertension", "blood pressure", "bp", "heart", "cardiovascular"],
    content:
      "NHMS 2023 Key Findings: about 29.2% of Malaysian adults have hypertension. Regular blood pressure checks and lifestyle changes (salt reduction, walking) are common preventive steps.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "nhms-cholesterol",
    title: "NHMS 2023 High Cholesterol",
    tags: ["cholesterol", "heart", "cardiovascular", "lipid"],
    content:
      "NHMS 2023 Key Findings: about 33.3% of Malaysian adults have high cholesterol. Heart family history, smoking, and low activity can raise cardiovascular attention.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "nhms-obesity",
    title: "NHMS 2023 Overweight/Obesity",
    tags: ["obesity", "overweight", "weight", "exercise", "walk", "steps"],
    content:
      "NHMS 2023 Key Findings: about 54.4% of Malaysian adults are overweight or obese. Daily walking and reducing sugary drinks are practical first steps.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "dosm-ihd",
    title: "DOSM 2024 Ischaemic Heart Diseases",
    tags: [
      "heart",
      "cardiovascular",
      "ischaemic",
      "death",
      "mortality",
      "dosm",
    ],
    content:
      "DOSM Statistics on Causes of Death, Malaysia 2025 (reporting 2024 deaths): ischaemic heart diseases were the principal cause of medically certified deaths (13.0%, 17,421 deaths). For ages 41–59, IHD was the leading cause (17.6%). Used only as national mortality context, not diagnosis.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "dosm-pneumonia",
    title: "DOSM 2024 Pneumonia",
    tags: ["pneumonia", "death", "mortality", "elderly", "60+", "dosm"],
    content:
      "DOSM 2025 release (2024 deaths): pneumonia was the second highest cause of medically certified deaths nationally (11.5%, 15,332 deaths), and the principal cause for ages 60+ (13.9%). National mortality context only.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "dosm-diabetes-death",
    title: "DOSM 2024 Diabetes Mellitus Deaths",
    tags: ["diabetes", "death", "mortality", "metabolic", "dosm"],
    content:
      "DOSM 2025 release (2024 deaths): diabetes mellitus accounted for 5.2% of medically certified deaths (6,929 deaths). This is mortality context; NHMS prevalence (15.6% of adults) is a separate prevalence statistic.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "dosm-transport",
    title: "DOSM 2024 Transport Accidents",
    tags: ["transport", "accident", "death", "young", "15-40", "mortality", "dosm"],
    content:
      "DOSM 2025 release (2024 deaths): transport accidents were 3.3% of medically certified deaths nationally, and the principal cause for ages 15–40 (20.0%). National mortality context only.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "screening",
    title: "Health screening guidance",
    tags: ["screening", "clinic", "peka", "checkup", "doctor", "test"],
    content:
      "For preventive care in Malaysia, consider blood pressure, blood glucose, and cholesterol screening at a clinic. PeKa B40 may support eligible groups. This app does not book appointments and is not a diagnosis.",
    source: "MOH / PeKa B40 (general guidance)",
  },
  {
    id: "lifestyle-sugar",
    title: "Reduce sugary drinks",
    tags: ["sugar", "drink", "soda", "metabolic", "diabetes"],
    content:
      "A practical goal is to reduce sugary drinks to 1–2 times per week and choose water or unsweetened drinks on most days.",
    source: "SihatQ preventive lifestyle guidance",
  },
  {
    id: "lifestyle-activity",
    title: "Physical activity",
    tags: ["exercise", "walk", "steps", "activity", "cardio"],
    content:
      "Starting with 20–30 minutes of walking on most days of the week is a common, low-barrier preventive habit.",
    source: "SihatQ preventive lifestyle guidance",
  },
  {
    id: "disclaimer",
    title: "Safety disclaimer",
    tags: ["diagnosis", "doctor", "safe", "disclaimer", "medical"],
    content:
      "SihatQ provides preventive insight only. It is not a medical diagnosis and does not replace advice from a qualified doctor or clinic.",
    source: "SihatQ Safety Policy",
  },
];

export function retrieveKnowledge(question: string, limit = 3): KnowledgeChunk[] {
  const q = question.toLowerCase();
  const scored = HEALTH_KNOWLEDGE.map((chunk) => {
    let score = 0;
    for (const tag of chunk.tags) {
      if (q.includes(tag)) score += 2;
    }
    for (const word of chunk.title.toLowerCase().split(/\s+/)) {
      if (word.length > 3 && q.includes(word)) score += 1;
    }
    return { chunk, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit).map((item) => item.chunk);
  if (top.length === 0) {
    return HEALTH_KNOWLEDGE.filter((c) =>
      ["disclaimer", "screening", "nhms-diabetes"].includes(c.id),
    );
  }
  // Always include disclaimer when answering health questions
  if (!top.some((c) => c.id === "disclaimer")) {
    const disclaimer = HEALTH_KNOWLEDGE.find((c) => c.id === "disclaimer");
    if (disclaimer) top.push(disclaimer);
  }
  return top.slice(0, limit + 1);
}
