import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const userId = data.user.id;

      // 1. Check user profile in Supabase
      const { data: userRecord } = await supabase
        .from("users")
        .select("id, onboarded, accountType, role")
        .eq("id", userId)
        .maybeSingle();

      const dbOnboardedVal = userRecord?.onboarded;
      const isDbOnboarded =
        dbOnboardedVal === 1 ||
        dbOnboardedVal === true ||
        String(dbOnboardedVal) === "1" ||
        String(dbOnboardedVal).toLowerCase() === "true";

      const isDbExplicitlyFalse =
        dbOnboardedVal === 0 ||
        dbOnboardedVal === false ||
        String(dbOnboardedVal) === "0" ||
        String(dbOnboardedVal).toLowerCase() === "false" ||
        dbOnboardedVal === null ||
        dbOnboardedVal === undefined;

      const metaOnboardedVal = data.user.user_metadata?.onboarded;
      const isMetaOnboarded =
        metaOnboardedVal === true ||
        String(metaOnboardedVal) === "1" ||
        String(metaOnboardedVal).toLowerCase() === "true";

      const isMetaExplicitlyFalse =
        metaOnboardedVal === false ||
        String(metaOnboardedVal) === "0" ||
        String(metaOnboardedVal).toLowerCase() === "false" ||
        metaOnboardedVal === null ||
        metaOnboardedVal === undefined;

      let isOnboarded = false;
      if (isDbExplicitlyFalse || isMetaExplicitlyFalse) {
        isOnboarded = false;
      } else {
        isOnboarded = isDbOnboarded || isMetaOnboarded;
      }

      const effectiveRole =
        userRecord?.accountType ||
        userRecord?.role ||
        data.user.user_metadata?.accountType ||
        data.user.user_metadata?.role ||
        "";

      let hasRole = Boolean(
        effectiveRole &&
        effectiveRole !== "individual" &&
        effectiveRole !== "corporate_member" &&
        effectiveRole !== "null"
      );

      // Check companies fallback for business accounts
      if (effectiveRole === "business" || !isOnboarded) {
        const { data: companies } = await supabase
          .from("companies")
          .select("status")
          .eq("owner_user_id", userId)
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

      // 2. If fully onboarded and has role, redirect directly to /home
      if (isOnboarded && hasRole) {
        return NextResponse.redirect(new URL("/home", request.url));
      }

      // 3. New users: redirect strictly to /role-selection (or /onboarding-business)
      if (effectiveRole === "business") {
        return NextResponse.redirect(new URL("/onboarding-business", request.url));
      }

      return NextResponse.redirect(new URL("/role-selection", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=Authentication failed", request.url));
}
