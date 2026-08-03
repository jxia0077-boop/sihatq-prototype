import {
  AdminStatsManager,
  type AdminStatRow,
} from "@/components/AdminStatsManager";
import { createServiceClient, hasServiceRoleKey } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStatsPage() {
  let rows: AdminStatRow[] = [];

  if (hasServiceRoleKey()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from("health_reference_stats")
      .select(
        "id, indicator, year, state, age_group, gender, value, unit, source_title, source_url",
      )
      .order("year", { ascending: false })
      .order("indicator");
    rows = (data || []) as AdminStatRow[];
  } else {
    // Fallback: authenticated read (RLS allows this)
    const supabase = await createClient();
    const { data } = await supabase
      .from("health_reference_stats")
      .select(
        "id, indicator, year, state, age_group, gender, value, unit, source_title, source_url",
      )
      .order("year", { ascending: false })
      .order("indicator");
    rows = (data || []) as AdminStatRow[];
  }

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold">Reference stats</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        NHMS prevalence and DOSM mortality rows used for comparisons and AI
        context.
      </p>
      <div className="mt-6">
        <AdminStatsManager
          initialRows={rows}
          canWrite={hasServiceRoleKey()}
        />
      </div>
    </div>
  );
}
