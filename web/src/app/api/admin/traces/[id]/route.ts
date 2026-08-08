import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { getTrace } from "@/lib/agent/observability/store";
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await assertAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const { id } = await context.params;
  const trace = await getTrace(id);
  if (!trace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }
  return NextResponse.json({ trace });
}
