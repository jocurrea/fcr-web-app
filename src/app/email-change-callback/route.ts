import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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
    const errorMsg = errorDesc || errorParam || "Email verification error";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url)
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

    // Sync newly confirmed email to public.users and public.user_profiles
    if (user.email) {
      try {
        await Promise.allSettled([
          supabase
            .from("users")
            .update({ email: user.email })
            .eq("id", userId),
          supabase
            .from("user_profiles")
            .update({ contactEmail: user.email })
            .eq("userId", userId),
        ]);
      } catch (syncErr) {
        console.error("[email-change-callback] Error syncing email:", syncErr);
      }
    }

    const redirectPath = next.startsWith("/") ? next : "/profile?email_changed=true";
    return NextResponse.redirect(new URL(redirectPath, request.url));
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
      if (hash.includes('access_token')) {
        var params = new URLSearchParams(hash.replace(/^#/, ''));
        var error = params.get('error') || params.get('error_description');
        if (error) {
          window.location.href = '/login?error=' + encodeURIComponent(error);
          return;
        }
        var next = new URLSearchParams(window.location.search).get('next') || '/profile?email_changed=true';
        window.location.href = next + hash;
      } else if (hash.includes('error=')) {
        var params = new URLSearchParams(hash.replace(/^#/, ''));
        var errorDesc = params.get('error_description') || params.get('error') || 'Email change failed';
        window.location.href = '/login?error=' + encodeURIComponent(errorDesc);
      } else {
        window.location.href = '/profile?email_changed=true';
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
