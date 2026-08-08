import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { listTraces } from "@/lib/agent/observability/store";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const url = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") || "40") || 40),
  );

  const { rows, source, note } = await listTraces(limit);
  return NextResponse.json({ traces: rows, source, note });
}
