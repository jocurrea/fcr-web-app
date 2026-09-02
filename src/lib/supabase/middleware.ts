import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Clean residual parameters on /login
  if (url.pathname === "/login" && (url.searchParams.has("edit") || url.searchParams.has("from"))) {
    url.searchParams.delete("edit");
    url.searchParams.delete("from");
    return NextResponse.redirect(url);
  }

  // Redirect onboarded users away from /role-selection unless explicitly editing from profile
  if (url.pathname === "/role-selection" && request.cookies.get("flightcrew_onboarded")?.value === "true") {
    const isProfileEdit = url.searchParams.get("from") === "profile" || url.searchParams.get("edit") === "company";
    if (!isProfileEdit) {
      url.pathname = "/home";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
