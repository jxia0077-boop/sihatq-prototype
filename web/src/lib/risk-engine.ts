import type {
  HealthReferenceStat,
  ProfileInput,
  Recommendation,
  RiskAssessment,
} from "@/lib/types";

function findStat(
  stats: HealthReferenceStat[],
  indicator: string,
): HealthReferenceStat | undefined {
  return stats.find((item) => item.indicator === indicator);
}

function formatPercent(value: number): string {
  return `${value}%`;
}

/**
 * Deterministic rule-based preventive insight.
 * Not a medical diagnosis.
 */
export function assessRisk(
  profile: ProfileInput,
  stats: HealthReferenceStat[],
): RiskAssessment {
  const diabetes = findStat(stats, "diabetes");
  const hypertension = findStat(stats, "hypertension");
  const highCholesterol = findStat(stats, "high_cholesterol");

  const olderAdult =
    profile.age_group === "46-60" || profile.age_group === "60+";
  const familyDiabetes = profile.family_history.includes("diabetes");
  const familyHeart = profile.family_history.includes("heart_disease");
  const familyHypertension = profile.family_history.includes("hypertension");
  const inactive = !profile.lifestyle.active_exercise;
  const smoker = profile.lifestyle.smoker;
  const highSugar = profile.lifestyle.high_sugar;

  const recommendations: Recommendation[] = [];
  let risk_category = "General Preventive Health";
  let risk_level: RiskAssessment["risk_level"] = "Low";
  let explanation =
    "Based on your profile, keep building healthy habits and attend routine health screenings.";
  let comparison_text = hypertension
    ? `NHMS ${hypertension.year}: ${formatPercent(Number(hypertension.value))} of Malaysian adults have hypertension (${hypertension.source_title}).`
    : "Compare your habits with Malaysia national health screening guidance.";
  let your_score = 35;
  let national_benchmark = Number(hypertension?.value ?? 29.2);

  if (olderAdult && familyDiabetes) {
    risk_category = "Metabolic / Diabetes Risk";
    risk_level = "Elevated";
    your_score = 68;
    national_benchmark = Number(diabetes?.value ?? 15.6);
    explanation =
      "You are in an older age group and reported a family history of diabetes. This combination is linked with higher metabolic risk and deserves proactive screening.";
    comparison_text = diabetes
      ? `NHMS ${diabetes.year}: ${formatPercent(Number(diabetes.value))} of Malaysian adults have diabetes (${diabetes.source_title}).`
      : comparison_text;
    recommendations.push({
      title: "Book a blood glucose / health screening",
      priority: "High",
      description:
        "Ask for fasting blood glucose or HbA1c through a clinic or PeKa B40 screening if eligible.",
      impact: "Metabolic Health",
    });
  } else if (familyHeart || smoker || (inactive && olderAdult)) {
    risk_category = "Cardiovascular Health";
    risk_level = smoker || familyHeart ? "Elevated" : "Moderate";
    your_score = smoker || familyHeart ? 65 : 55;
    national_benchmark = Number(highCholesterol?.value ?? 33.3);
    explanation =
      "Your profile suggests cardiovascular risk factors such as family heart history, smoking, and/or low activity. Small daily movement and screening can help.";
    comparison_text = highCholesterol
      ? `NHMS ${highCholesterol.year}: ${formatPercent(Number(highCholesterol.value))} of Malaysian adults have high cholesterol (${highCholesterol.source_title}).`
      : comparison_text;
    recommendations.push({
      title: "Book a blood pressure screening",
      priority: "High",
      description:
        "Check blood pressure at a clinic or community screening point, especially if you have family heart history.",
      impact: "Heart Health",
    });
  } else if (familyHypertension || highSugar) {
    risk_category = "Metabolic / Lifestyle Risk";
    risk_level = "Moderate";
    your_score = 52;
    national_benchmark = Number(hypertension?.value ?? 29.2);
    explanation =
      "Lifestyle and family history signals point to moderate metabolic risk. Reducing sugary drinks and staying active are practical first steps.";
    comparison_text = hypertension
      ? `NHMS ${hypertension.year}: ${formatPercent(Number(hypertension.value))} of Malaysian adults have hypertension (${hypertension.source_title}).`
      : comparison_text;
  }

  if (highSugar) {
    recommendations.push({
      title: "Reduce sugary drinks",
      priority: "Medium",
      description:
        "Aim for water or unsweetened drinks most days; limit sugary drinks to 1–2 times per week.",
      impact: "Metabolic Health",
    });
  }

  if (inactive) {
    recommendations.push({
      title: "Start a 20–30 minute walk",
      priority: "Medium",
      description: "Walk 5 days per week. Short breaks after meals also help.",
      impact: "Cardiovascular Fitness",
    });
  }

  if (smoker) {
    recommendations.push({
      title: "Plan a smoke-free week",
      priority: "High",
      description:
        "Talk to a pharmacist or clinic about quit-smoking support. Cutting down is a strong first step.",
      impact: "Heart & Lung Health",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Keep up routine health screening",
      priority: "Low",
      description:
        "Schedule a basic health check (BP, glucose, cholesterol) once a year and track your habits.",
      impact: "Preventive Care",
    });
  }

  return {
    risk_category,
    risk_level,
    explanation,
    comparison_text,
    recommendations,
    your_score,
    national_benchmark,
  };
}
