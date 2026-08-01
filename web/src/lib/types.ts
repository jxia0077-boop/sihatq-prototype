export const AGE_GROUPS = ["18-30", "31-45", "46-60", "60+"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const STATES = [
  "Selangor",
  "Kuala Lumpur",
  "Johor",
  "Penang",
  "Sabah",
  "Sarawak",
  "Perak",
  "Melaka",
  "Kedah",
  "Kelantan",
  "Negeri Sembilan",
  "Pahang",
  "Perlis",
  "Terengganu",
  "Putrajaya",
  "Labuan",
] as const;
export type MalaysianState = (typeof STATES)[number];

export const FAMILY_HISTORY_OPTIONS = [
  "diabetes",
  "heart_disease",
  "hypertension",
  "none",
] as const;
export type FamilyHistoryOption = (typeof FAMILY_HISTORY_OPTIONS)[number];

export type Lifestyle = {
  smoker: boolean;
  active_exercise: boolean;
  high_sugar: boolean;
};

export type ProfileInput = {
  age_group: AgeGroup;
  gender: Gender;
  state: MalaysianState;
  lifestyle: Lifestyle;
  family_history: FamilyHistoryOption[];
};

export type Recommendation = {
  title: string;
  priority: "High" | "Medium" | "Low";
  description: string;
  impact: string;
};

export type RiskAssessment = {
  risk_category: string;
  risk_level: "Low" | "Moderate" | "Elevated";
  explanation: string;
  comparison_text: string;
  recommendations: Recommendation[];
  your_score: number;
  national_benchmark: number;
};

export type HealthReferenceStat = {
  id: string;
  indicator: string;
  year: number;
  value: number;
  unit: string;
  source_title: string;
  source_url: string | null;
};

export type RiskResultRow = {
  id: string;
  user_id: string;
  risk_category: string;
  risk_level: string;
  explanation: string;
  comparison_text: string;
  recommendations: Recommendation[];
  created_at: string;
};
