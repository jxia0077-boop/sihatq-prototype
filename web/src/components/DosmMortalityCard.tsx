import { CACHE_KEYS, cacheGet, cacheSet } from "@/lib/redis";
import { createClient } from "@/lib/supabase/server";

type StatRow = {
  indicator: string;
  value: number | string;
  unit: string;
  age_group: string | null;
  source_title: string | null;
  source_url: string | null;
};

const LABEL: Record<string, string> = {
  ischaemic_heart_diseases_principal_cause: "Ischaemic heart diseases",
  pneumonia_principal_cause: "Pneumonia",
  diabetes_mellitus_principal_cause: "Diabetes mellitus",
  transport_accidents_principal_cause: "Transport accidents",
  transport_accidents_age_15_40: "Transport accidents (ages 15–40)",
  ischaemic_heart_diseases_age_41_59: "Ischaemic heart diseases (ages 41–59)",
  pneumonia_age_60_plus: "Pneumonia (ages 60+)",
};

const FALLBACK: StatRow[] = [
  {
    indicator: "ischaemic_heart_diseases_principal_cause",
    value: 13.0,
    unit: "percent_of_medically_certified_deaths",
    age_group: "all",
    source_title: "Statistics on Causes of Death, Malaysia, 2025",
    source_url:
      "https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025",
  },
  {
    indicator: "pneumonia_principal_cause",
    value: 11.5,
    unit: "percent_of_medically_certified_deaths",
    age_group: "all",
    source_title: "Statistics on Causes of Death, Malaysia, 2025",
    source_url:
      "https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025",
  },
  {
    indicator: "diabetes_mellitus_principal_cause",
    value: 5.2,
    unit: "percent_of_medically_certified_deaths",
    age_group: "all",
    source_title: "Statistics on Causes of Death, Malaysia, 2025",
    source_url:
      "https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025",
  },
  {
    indicator: "transport_accidents_principal_cause",
    value: 3.3,
    unit: "percent_of_medically_certified_deaths",
    age_group: "all",
    source_title: "Statistics on Causes of Death, Malaysia, 2025",
    source_url:
      "https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025",
  },
];

export async function DosmMortalityCard() {
  let data =
    (await cacheGet<StatRow[]>(CACHE_KEYS.dosm2024)) || null;

  if (!data) {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("health_reference_stats")
      .select("indicator, value, unit, age_group, source_title, source_url")
      .eq("year", 2024)
      .in("indicator", Object.keys(LABEL))
      .order("value", { ascending: false });

    data = (rows || []) as StatRow[];
    if (data.length > 0) {
      await cacheSet(CACHE_KEYS.dosm2024, data);
    }
  }

  const rows = (data && data.length > 0 ? data : FALLBACK) as StatRow[];
  const national = rows.filter(
    (row) => !row.age_group || row.age_group === "all",
  );
  const byAge = rows.filter(
    (row) => row.age_group && row.age_group !== "all",
  );
  const sourceTitle =
    rows[0]?.source_title || "Statistics on Causes of Death, Malaysia, 2025";
  const sourceUrl =
    rows[0]?.source_url ||
    "https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025";

  return (
    <section className="mt-6 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        National mortality context (DOSM)
      </p>
      <p className="mt-2 text-sm text-on-surface-variant">
        2024 medically certified deaths — background only, not a personal
        diagnosis. Source: {sourceTitle}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {national.map((row) => (
          <div
            key={row.indicator}
            className="rounded-xl bg-surface-container px-4 py-3"
          >
            <p className="text-sm font-medium text-on-surface">
              {LABEL[row.indicator] || row.indicator}
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-primary">
              {Number(row.value)}%
            </p>
            <p className="text-xs text-on-surface-variant">
              of medically certified deaths
            </p>
          </div>
        ))}
      </div>

      {byAge.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-on-surface-variant">
            Leading cause by age group
          </p>
          {byAge.map((row) => (
            <div
              key={row.indicator}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm"
            >
              <span>{LABEL[row.indicator] || row.indicator}</span>
              <span className="font-semibold text-primary">
                {Number(row.value)}%
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
      >
        View DOSM release
      </a>
    </section>
  );
}
