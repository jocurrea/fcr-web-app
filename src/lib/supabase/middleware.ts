import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Clean residual parameters on /login
  if (pathname === "/login" && (url.searchParams.has("edit") || url.searchParams.has("from"))) {
    url.searchParams.delete("edit");
    url.searchParams.delete("from");
    return NextResponse.redirect(url);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthCallback = pathname === "/auth/callback";
  if (isAuthCallback) {
    return response;
  }

  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/welcome" ||
    pathname === "/forgotPassword" ||
    pathname === "/reset";

  const isPublicStaticRoute =
    pathname === "/privacyPolicy" ||
    pathname === "/termsAndConditions" ||
    pathname === "/community-safety" ||
    pathname === "/_not-found";

  const isOnboardingRoute =
    pathname === "/role-selection" ||
    pathname.startsWith("/onboarding"); // /onboarding, /onboarding-business, /onboarding-complete

  const isRoot = pathname === "/";

  // Helper to carry cookies over redirects
  const makeRedirect = (target: string) => {
    const redirectUrl = new URL(target, request.url);
    const redirectRes = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value, c);
    });
    return redirectRes;
  };

  // -------------------------------------------------------------
  // Case A: Unauthenticated user
  // -------------------------------------------------------------
  if (!user) {
    if (isPublicAuthRoute || isPublicStaticRoute) {
      return response;
    }
    if (isRoot) {
      return makeRedirect("/welcome");
    }
    // Protected or onboarding routes require login
    return makeRedirect("/login");
  }

  // -------------------------------------------------------------
  // Case B: Authenticated user — evaluate real profile status
  // -------------------------------------------------------------
  const { data: userRecord } = await supabase
    .from("users")
    .select("id, onboarded, accountType, role, professionalRole")
    .eq("id", user.id)
    .maybeSingle();

  const dbOnboardedVal = userRecord?.onboarded;
  const isDbOnboarded =
    dbOnboardedVal === 1 ||
    dbOnboardedVal === true ||
    String(dbOnboardedVal) === "1" ||
    String(dbOnboardedVal).toLowerCase() === "true";

  const metaOnboardedVal = user.user_metadata?.onboarded;
  const isMetaOnboarded =
    metaOnboardedVal === true ||
    String(metaOnboardedVal) === "1" ||
    String(metaOnboardedVal).toLowerCase() === "true";

  const isCookieOnboarded = request.cookies.get("flightcrew_onboarded")?.value === "true";

  // Database is authoritative; supplemented by fresh JWT metadata and cookies
  let isOnboarded = false;
  if (isDbOnboarded || isMetaOnboarded) {
    isOnboarded = true;
  } else if (isCookieOnboarded && dbOnboardedVal !== 0 && String(dbOnboardedVal) !== "0") {
    isOnboarded = true;
  } else {
    isOnboarded = false;
  }

  const effectiveRole =
    userRecord?.accountType ||
    userRecord?.role ||
    userRecord?.professionalRole ||
    user.user_metadata?.accountType ||
    user.user_metadata?.role ||
    user.user_metadata?.professionalRole ||
    user.user_metadata?.professional_role ||
    "";

  let hasRole = Boolean(
    effectiveRole &&
    effectiveRole !== "individual" &&
    effectiveRole !== "corporate_member" &&
    effectiveRole !== "null"
  );

  // Fallback for business accounts with approved company
  if (!isOnboarded && effectiveRole === "business") {
    const { data: companies } = await supabase
      .from("companies")
      .select("status")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (companies && companies.length > 0) {
      const status = companies[0].status;
      if (status === "approved" || status === "active" || status === "pending") {
        isOnboarded = true;
        hasRole = true;
      }
    }
  }

  // Synchronize flightcrew_onboarded cookie with verified status
  if (isOnboarded && hasRole) {
    response.cookies.set("flightcrew_onboarded", "true", { path: "/", maxAge: 31536000 });
  } else {
    response.cookies.set("flightcrew_onboarded", "false", { path: "/", maxAge: 0 });
  }

  // 1. User is NOT fully onboarded or has no role
  if (!isOnboarded || !hasRole) {
    // If attempting to access /home or any protected route
    if (pathname === "/home" || (!isOnboardingRoute && !isPublicStaticRoute)) {
      return makeRedirect("/role-selection");
    }
    // Allow onboarding flow and static legal pages
    return response;
  }

  // 2. User IS fully onboarded and has a role
  if (isOnboarded && hasRole) {
    // If trying to access public auth routes or welcome
    if (isPublicAuthRoute || isRoot) {
      return makeRedirect("/home");
    }

    // If trying to access /role-selection without explicit edit parameter
    if (pathname === "/role-selection") {
      const isExplicitEdit =
        url.searchParams.get("from") === "profile" ||
        url.searchParams.get("edit") === "company";
      if (!isExplicitEdit) {
        return makeRedirect("/home");
      }
    }

    // If trying to access /onboarding without edit flag
    if (pathname === "/onboarding" && !url.searchParams.has("edit")) {
      return makeRedirect("/home");
    }

    return response;
  }

  return response;
}
