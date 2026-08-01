import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key. Copy web/.env.local.example to web/.env.local and fill in your Supabase keys.",
    );
  }

  return createBrowserClient(url, key);
}
