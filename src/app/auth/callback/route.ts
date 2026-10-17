import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  if (errorParam || errorDesc) {
    const errorMsg = errorDesc || errorParam || "Authentication error";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url)
    );
  }

  const supabase = await createClient();
  let userSessionData: any = null;

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (!error && data?.user) {
      userSessionData = data;
    }
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      userSessionData = data;
    }
  }

  if (userSessionData?.user) {
    const user = userSessionData.user;
    const userId = user.id;

    // FIX-B.3: Sync verified new email to public.users & public.user_profiles table (with admin client fallback for Backoffice sync)
    if (user.email) {
      try {
        let adminClient: any = null;
        try {
          adminClient = createAdminClient();
        } catch {}

        const dbClient = adminClient || supabase;
        await Promise.allSettled([
          dbClient.from("users").update({ email: user.email }).eq("id", userId),
          dbClient.from("user_profiles").update({ contactEmail: user.email }).eq("userId", userId),
        ]);
      } catch (syncErr) {
        console.error("[auth/callback] Error syncing email to users table:", syncErr);
      }
    }

    if (type === "recovery" || next?.startsWith("/reset-password")) {
      return NextResponse.redirect(new URL("/reset-password", request.url));
    }

    if (next && next.startsWith("/")) {
      return NextResponse.redirect(new URL(next, request.url));
    }

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

      const metaOnboardedVal = user.user_metadata?.onboarded;
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
        user.user_metadata?.accountType ||
        user.user_metadata?.role ||
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

  // Fallback for implicit hash fragments (e.g. #access_token=...&type=recovery or type=email_change)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verifying Authentication...</title>
  <script>
    if (window.location.hash && window.location.hash.includes('access_token')) {
      var hash = window.location.hash;
      var hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      var isRecovery = hashParams.get('type') === 'recovery' || new URLSearchParams(window.location.search).get('type') === 'recovery';
      var next = new URLSearchParams(window.location.search).get('next') || (isRecovery ? '/reset-password' : '/profile');
      window.location.href = next + hash;
    } else {
      var isRecoveryQuery = new URLSearchParams(window.location.search).get('type') === 'recovery';
      if (isRecoveryQuery) {
        window.location.href = '/reset-password' + window.location.search;
      } else {
        window.location.href = '/login?error=Authentication failed';
      }
    }
  </script>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p style="color:#666;font-size:14px;">Completing authentication, please wait...</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
