import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type");
  const type = (typeParam as EmailOtpType) || "email_change";
  const next = requestUrl.searchParams.get("next") || "/profile?email_changed=true";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  if (errorParam || errorDesc) {
    // HU-06 Acceptance Criteria 1: Suppress error banners upon landing from email confirmation
    return NextResponse.redirect(
      new URL("/login?confirmation_processed=true", request.url)
    );
  }

  const supabase = await createClient();
  let userSessionData: any = null;

  if (token_hash) {
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

    // HU-06 Acceptance Criteria 3: Backoffice Admin Sync
    // Double-confirmed email changes must instantly update and sync with the admin dashboard database (user_profiles & users)
    if (user.email) {
      try {
        let adminClient: any = null;
        try {
          adminClient = createAdminClient();
        } catch {}

        const dbClient = adminClient || supabase;
        await Promise.allSettled([
          dbClient.from("users").update({ email: user.email }).eq("id", userId),
          dbClient.from("user_profiles").update({ contactEmail: user.email, email: user.email }).eq("userId", userId),
          dbClient.from("user_profiles").update({ contactEmail: user.email, email: user.email }).eq("user_id", userId),
          dbClient.from("resumes").select("data").eq("userId", userId).maybeSingle().then(async ({ data: r }: any) => {
            if (r?.data?.personal) {
              const updatedData = { ...r.data, personal: { ...r.data.personal, contactEmail: user.email, email: user.email } };
              await dbClient.from("resumes").update({ data: updatedData }).eq("userId", userId);
            }
          }),
        ]);
      } catch (syncErr) {
        console.error("[email-change-callback] Error syncing email to user_profiles table:", syncErr);
      }
    }

    // HU-06 Acceptance Criteria 2: Clean Confirmation Success Guidance
    return NextResponse.redirect(new URL("/login?confirmation_processed=true", request.url));
  }

  // Fallback HTML for clients that receive tokens via hash fragment (#access_token=...&type=email_change)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verifying Email Change...</title>
  <script>
    (function() {
      var hash = window.location.hash || '';
      if (hash.includes('message=')) {
        window.location.href = '/login' + hash;
      } else if (hash.includes('access_token')) {
        window.location.href = '/login?confirmation_processed=true' + hash;
      } else {
        window.location.href = '/login?confirmation_processed=true';
      }
    })();
  </script>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background-color:#f9fafb;">
  <div style="text-align:center;padding:24px;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);max-width:360px;">
    <h2 style="font-size:18px;font-weight:600;color:#111827;margin-bottom:8px;">Verifying Email Change</h2>
    <p style="color:#6b7280;font-size:14px;margin:0;">Please wait while we confirm your updated email address...</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
