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

      let isOnboarded =
        userRecord?.onboarded === 1 ||
        userRecord?.onboarded === true ||
        String(userRecord?.onboarded) === "1" ||
        String(userRecord?.onboarded).toLowerCase() === "true" ||
        data.user.user_metadata?.onboarded === true;

      const effectiveRole =
        userRecord?.accountType ||
        userRecord?.role ||
        data.user.user_metadata?.accountType ||
        "";

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
          }
        }
      }

      // Check resume fallback
      if (!isOnboarded) {
        const { data: resumeData } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", userId)
          .maybeSingle();

        if (resumeData?.data) {
          isOnboarded = true;
        }
      }

      // 2. If onboarded, redirect directly to /home
      if (isOnboarded) {
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
