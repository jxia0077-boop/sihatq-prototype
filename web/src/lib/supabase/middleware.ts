import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/analyzing") ||
    pathname.startsWith("/risk-insight") ||
    pathname.startsWith("/recommendations") ||
    pathname.startsWith("/result-detail") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/ai-assistant") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/assess") ||
    pathname.startsWith("/api/ai-chat") ||
    pathname.startsWith("/api/admin");

  // Guest assessment flow: allow visitors to complete assessment
  // without viewing /login or /sign-up pages.
  const isAssessmentFlow =
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/analyzing") ||
    pathname.startsWith("/risk-insight") ||
    pathname.startsWith("/recommendations") ||
    pathname.startsWith("/result-detail") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/api/assess");

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/sign-up");

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    // Keep admin/dashboard protected, but allow the guest assessment flow.
    if (!isAssessmentFlow) {
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  if (isAuthPage && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
