import { createClient } from "@/lib/supabase/server";

type EvidenceStat = {
  indicator: string;
  year: number;
  state: string | null;
  age_group: string | null;
  gender: string | null;
  value: number | string;
  unit: string;
  source_title: string | null;
  source_url: string | null;
};

const FALLBACK_EVIDENCE: EvidenceStat[] = [
  {
    indicator: "diabetes",
    year: 2019,
    state: null,
    age_group: null,
    gender: null,
    value: 18.3,
    unit: "percent",
    source_title: "National Health and Morbidity Survey (NHMS)",
    source_url: null,
  },
  {
    indicator: "hypertension",
    year: 2019,
    state: null,
    age_group: null,
    gender: null,
    value: 30,
    unit: "percent",
    source_title: "National Health and Morbidity Survey (NHMS)",
    source_url: null,
  },
  {
    indicator: "high_cholesterol",
    year: 2019,
    state: null,
    age_group: null,
    gender: null,
    value: 38.1,
    unit: "percent",
    source_title: "National Health and Morbidity Survey (NHMS)",
    source_url: null,
  },
];

function indicatorsForRisk(category: string) {
  const lower = category.toLowerCase();
  if (/cardio|heart|cholesterol/.test(lower)) {
    return [
      "high_cholesterol",
      "hypertension",
      "ischaemic_heart_diseases_principal_cause",
    ];
  }
  if (/diabetes|metabolic|lifestyle/.test(lower)) {
    return ["diabetes", "hypertension", "overweight_obesity"];
  }
  return ["hypertension", "diabetes", "high_cholesterol"];
}

function prettyIndicator(indicator: string) {
  return indicator
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(row: EvidenceStat) {
  const value = Number(row.value);
  if (row.unit === "percent") return `${value}%`;
  if (row.unit.includes("percent")) return `${value}%`;
  return `${value} ${row.unit}`;
}

export async function EvidenceReportSection({
  riskCategory,
  comparisonText,
  yourScore,
  nationalBenchmark,
}: {
  riskCategory: string;
  comparisonText: string;
  yourScore: number;
  nationalBenchmark: number;
}) {
  const indicators = indicatorsForRisk(riskCategory);
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_reference_stats")
    .select(
      "indicator, year, state, age_group, gender, value, unit, source_title, source_url",
    )
    .in("indicator", indicators)
    .order("year", { ascending: false })
    .limit(8);

  const rows = ((data && data.length > 0 ? data : FALLBACK_EVIDENCE) ||
    []) as EvidenceStat[];
  const sourceCount = new Set(
    rows.map((row) => row.source_title || row.source_url).filter(Boolean),
  ).size;
  const delta = yourScore - nationalBenchmark;

  return (
    <section className="mt-10 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[var(--elevation-soft)]">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Evidence-backed report
          </p>
          <h3 className="mt-2 font-headline text-xl font-semibold">
            Why this result was shown
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            SihatQ combines your non-identifying profile answers with Malaysian
            public reference statistics. These sources give population context,
            not a personal diagnosis.
          </p>
        </div>
        <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
          <strong>{sourceCount || 1}</strong> source
          {sourceCount === 1 ? "" : "s"} linked
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Score interpretation
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>Your SihatQ risk score</span>
              <strong className="text-primary">{yourScore}%</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>National benchmark used</span>
              <strong>{nationalBenchmark}%</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Difference</span>
              <strong className={delta >= 0 ? "text-error" : "text-primary"}>
                {delta >= 0 ? "+" : ""}
                {delta} points
              </strong>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            {comparisonText}
          </p>
        </article>

        <div className="space-y-3">
          {rows.slice(0, 4).map((row) => (
            <article
              key={`${row.indicator}-${row.year}-${row.state || "national"}-${row.age_group || "all"}`}
              className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {prettyIndicator(row.indicator)}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {[row.year, row.state, row.age_group, row.gender]
                      .filter(Boolean)
                      .join(" · ") || "national"}
                  </p>
                </div>
                <p className="font-headline text-2xl font-bold text-primary">
                  {formatValue(row)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Used as population context for {riskCategory.toLowerCase()} and
                recommendation prioritisation.
              </p>
              {row.source_url ? (
                <a
                  href={row.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  {row.source_title || "View source"}
                </a>
              ) : (
                <p className="mt-2 text-xs text-on-surface-variant">
                  Source: {row.source_title || "Public Malaysian health data"}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
