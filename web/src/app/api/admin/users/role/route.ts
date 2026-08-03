import { NextResponse } from "next/server";
import {
  createServiceClient,
  hasServiceRoleKey,
  isAdminUser,
  type AppRole,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const userId = String(body.userId || "");
  const role = String(body.role || "") as AppRole;

  if (!userId || (role !== "admin" && role !== "user")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (userId === user.id && role === "user") {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("user_roles")
    .upsert(
      { user_id: userId, role, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("user_id, role")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("user_roles") || error.code === "42P01"
            ? "Run migration 003_user_roles.sql in Supabase SQL Editor first."
            : error.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ row: data });
}
