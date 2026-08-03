import { NextResponse } from "next/server";
import {
  createServiceClient,
  hasServiceRoleKey,
  isAdminUser,
} from "@/lib/admin";
import { invalidateHealthStatsCache } from "@/lib/redis";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!hasServiceRoleKey()) {
    return {
      error: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
        { status: 503 },
      ),
    };
  }
  return { user };
}

function parseBody(body: Record<string, unknown>) {
  const indicator = String(body.indicator || "").trim();
  const year = Number(body.year);
  const value = Number(body.value);
  const unit = String(body.unit || "percent").trim();
  const source_title = String(body.source_title || "").trim();
  const source_url = body.source_url
    ? String(body.source_url).trim()
    : null;
  const state = body.state ? String(body.state).trim() : null;
  const age_group = body.age_group ? String(body.age_group).trim() : null;
  const gender = body.gender ? String(body.gender).trim() : null;

  if (!indicator || !source_title || Number.isNaN(year) || Number.isNaN(value)) {
    return null;
  }

  return {
    indicator,
    year,
    value,
    unit,
    source_title,
    source_url,
    state: state || null,
    age_group: age_group || null,
    gender: gender || null,
  };
}

export async function POST(request: Request) {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const body = await request.json();
  const row = parseBody(body);
  if (!row) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("health_reference_stats")
    .insert(row)
    .select(
      "id, indicator, year, state, age_group, gender, value, unit, source_title, source_url",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await invalidateHealthStatsCache();
  return NextResponse.json({ row: data });
}

export async function PATCH(request: Request) {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const body = await request.json();
  const id = String(body.id || "");
  const row = parseBody(body);
  if (!id || !row) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("health_reference_stats")
    .update(row)
    .eq("id", id)
    .select(
      "id, indicator, year, state, age_group, gender, value, unit, source_title, source_url",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await invalidateHealthStatsCache();
  return NextResponse.json({ row: data });
}

export async function DELETE(request: Request) {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("health_reference_stats")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await invalidateHealthStatsCache();
  return NextResponse.json({ ok: true });
}
