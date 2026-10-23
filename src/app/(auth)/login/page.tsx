"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, EyeOff, Eye, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type EmailChangeNotice = {
  step: "pending_second_email" | "email_change_success";
  title: string;
  subtitle: string;
  message: string;
  detail?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailChangeNotice, setEmailChangeNotice] = useState<EmailChangeNotice | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clean any residual parameters (like ?edit=true&from=onboarding) from the URL or session
  const cleanResidualParams = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("onboarding_step");
        const url = new URL(window.location.href);
        let changed = false;
        if (url.searchParams.has("edit")) {
          url.searchParams.delete("edit");
          changed = true;
        }
        if (url.searchParams.has("from")) {
          url.searchParams.delete("from");
          changed = true;
        }
        if (changed) {
          const cleanQuery = url.searchParams.toString();
          const cleanUrl = url.pathname + (cleanQuery ? `?${cleanQuery}` : "");
          window.history.replaceState(null, "", cleanUrl);
        }
      } catch (e) {
        console.error("Error cleaning residual params:", e);
      }
    }
  }, []);

  const handlePostLoginRedirect = useCallback(async (userId: string, session: Session | null) => {
    const prevUserId = typeof window !== "undefined" ? localStorage.getItem("current_user_id") : null;
    if (prevUserId && prevUserId !== userId && typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("onboarding_") ||
              key.startsWith("userProfile") ||
              key.startsWith("userCover") ||
              key.startsWith("user_posts") ||
              key.startsWith("userName") ||
              key === "cached_affiliation" ||
              key.startsWith("cached_") ||
              key === "account_type" ||
              key === "accountType")
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("current_user_id", userId);
    }

    try {
      // 1. Validación de Estado: Consulta el perfil del usuario en la base de datos (Supabase)
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id, onboarded, accountType, role")
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.warn("[Login] Error fetching user record:", userError);
      }

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

      const metaOnboardedVal = session?.user?.user_metadata?.onboarded;
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
        session?.user?.user_metadata?.accountType ||
        session?.user?.user_metadata?.role ||
        "";

      let hasRole = Boolean(
        effectiveRole &&
        effectiveRole !== "individual" &&
        effectiveRole !== "corporate_member" &&
        effectiveRole !== "null"
      );

      // Check if business user already completed onboarding via companies table
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

      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const pendingInviteToken = typeof window !== "undefined" ? (sessionStorage.getItem("fcr_invitation_token") || sessionStorage.getItem("pending_invite_token")) : null;
      let redirectTarget = urlParams?.get("redirect") || (typeof window !== "undefined" ? sessionStorage.getItem("auth_redirect_url") : null);

      // If there is an active invitation token in the session, ensure we return to accept page
      if (!redirectTarget && pendingInviteToken) {
        redirectTarget = "/invitations/accept";
      }

      // 2. Ruta Correcta: Si el usuario ya tiene su cuenta configurada y rol asignado,
      // respeta redirectTarget (p.ej. /invitations/accept) o navega hacia /home
      if (isOnboarded && hasRole) {
        try {
          document.cookie = "flightcrew_onboarded=true; path=/; max-age=31536000";
          sessionStorage.setItem("flightcrew_onboarded", "true");
          localStorage.setItem("flightcrew_onboarded", "true");
        } catch (e) {}

        if (redirectTarget && redirectTarget.startsWith("/")) {
          if (typeof window !== "undefined") sessionStorage.removeItem("auth_redirect_url");
          router.replace(redirectTarget);
          return;
        }

        router.replace("/home");
        return;
      }

      // 3. Ruta de Nuevos Usuarios: La redirección hacia /role-selection debe ser estrictamente
      // exclusiva para usuarios nuevos cuyo registro indique onboarded === false o nulo
      if (effectiveRole === "business") {
        router.replace(redirectTarget ? `/onboarding-business?redirect=${encodeURIComponent(redirectTarget)}` : "/onboarding-business");
        return;
      }

      router.replace(redirectTarget ? `/role-selection?redirect=${encodeURIComponent(redirectTarget)}` : "/role-selection");
    } catch (redirectErr) {
      console.error("[Login] Redirect error:", redirectErr);
      router.replace("/home");
    }
  }, [cleanResidualParams, router]);

  useEffect(() => {
    let isEmailChangeAction = false;

    if (typeof window !== "undefined") {
      const rawHash = window.location.hash || "";

      if (rawHash) {
        const hashParams = new URLSearchParams(rawHash.replace(/^#/, ""));
        const hashMessage = hashParams.get("message") || "";
        const hashType = hashParams.get("type") || "";
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashError = hashParams.get("error") || hashParams.get("error_description");

        // Case A: Password Recovery link arrives on /login
        if (hashType === "recovery" || rawHash.includes("type=recovery")) {
          router.replace(`/reset-password${window.location.search || ""}${rawHash}`);
          return;
        }

        // Case B: Signup email confirmation
        if (hashType === "signup" || rawHash.includes("type=signup")) {
          setSuccessMessage("Your email address has been verified successfully! Please log in to continue.");
          window.history.replaceState(null, "", window.location.pathname);
        }

        const normalizedMessage = hashMessage.toLowerCase();
        const isFirstConfirmation =
          normalizedMessage.includes("confirmation link accepted") ||
          normalizedMessage.includes("confirm link sent to the other email") ||
          (normalizedMessage.includes("confirmation") && normalizedMessage.includes("other email"));

        // Case 1: First confirmation link clicked
        if (isFirstConfirmation) {
          isEmailChangeAction = true;
          // Clean hash from URL immediately so raw message is hidden from address bar
          window.history.replaceState(null, "", window.location.pathname);

          setEmailChangeNotice({
            step: "pending_second_email",
            title: "Confirmation Accepted",
            subtitle: "Please check your other inbox",
            message:
              "We have verified this confirmation link. To finalize your email change, please open the other inbox and click the confirmation link sent there.",
            detail:
              "For security, Supabase requires confirmation from both your current email and your new email address.",
          });
        }
        // Case 2: Second confirmation link clicked (email change finalized)
        else if (hashType === "email_change" || (accessToken && hashType === "email_change")) {
          isEmailChangeAction = true;
          // Clean hash immediately from URL to protect tokens
          window.history.replaceState(null, "", window.location.pathname);

          if (accessToken && refreshToken) {
            supabase.auth
              .setSession({ access_token: accessToken, refresh_token: refreshToken })
              .then(async ({ data, error }) => {
                if (!error && data?.user?.email) {
                  const updatedEmail = data.user.email;
                  setEmail(updatedEmail);
                  try {
                    await Promise.allSettled([
                      supabase.from("users").update({ email: updatedEmail }).eq("id", data.user.id),
                      supabase.from("user_profiles").update({ contactEmail: updatedEmail }).eq("userId", data.user.id),
                    ]);
                  } catch (e) {
                    console.warn("Could not sync email update to database:", e);
                  }
                }
              })
              .catch((err) => {
                console.error("Error setting session for email change:", err);
              });
          }

          setEmailChangeNotice({
            step: "email_change_success",
            title: "Email Successfully Updated!",
            subtitle: "Your new email is now active",
            message:
              "Your email address has been verified and updated. You can now use your new email address to sign in.",
            detail:
              "All notifications and account recovery messages will now be sent to your updated email address.",
          });
        }
        // Case 3: Error in hash
        else if (hashError) {
          window.history.replaceState(null, "", window.location.pathname);
          const decoded = hashError.replace(/\+/g, " ");
          if (!decoded.toLowerCase().includes("authentication failed")) {
            setError(decoded);
          }
        }
      }

      // Check search params for recovery
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("type") === "recovery") {
        router.replace(`/reset-password${window.location.search || ""}`);
        return;
      }

      // Check search params for confirmation success
      if (
        urlParams.get("confirmed") === "true" ||
        urlParams.get("email_confirmed") === "true" ||
        urlParams.get("type") === "signup"
      ) {
        setSuccessMessage("Your email address has been verified successfully! Please log in to continue.");
      }

      // Capture invitation token and redirect if present in URL
      const tokenParam = urlParams.get("invite_id") || urlParams.get("token") || urlParams.get("invite");
      if (tokenParam) {
        sessionStorage.setItem("pending_invite_token", tokenParam);
      }
      const redirectParam = urlParams.get("redirect");
      if (redirectParam) {
        sessionStorage.setItem("auth_redirect_url", redirectParam);
      }
      const searchError = urlParams.get("error") || urlParams.get("error_description");
      if (searchError) {
        const decoded = searchError.replace(/\+/g, " ");
        // Explicitly suppress default "Authentication failed" upon landing from an auth redirect
        if (!decoded.toLowerCase().includes("authentication failed")) {
          setError(decoded);
        }
      }
    }

    cleanResidualParams();

    // Do not check session or auto-redirect if an email change action is being displayed
    if (isEmailChangeAction) {
      return;
    }

    // If an existing session is already active, verify validity before redirecting
    async function checkExistingSession() {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          // If no verified user session exists, purge any stale local tokens to avoid loops
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          localStorage.removeItem("current_user_id");
          localStorage.removeItem("account_type");
          localStorage.removeItem("flightcrew_onboarded");
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handlePostLoginRedirect(session.user.id, session);
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    }

    checkExistingSession();
  }, [cleanResidualParams, handlePostLoginRedirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        await handlePostLoginRedirect(data.session.user.id, data.session);
      } else {
        // Fallback
        router.replace("/home");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "");
      if (msg.includes("Email not confirmed")) {
        setError("Your email confirmation is pending. Please check your inbox or confirm your email to sign in.");
      } else if (msg.includes("Invalid login credentials")) {
        setError("Invalid credentials or email confirmation pending. If you just registered, please verify your email address.");
      } else {
        setError(msg || "Invalid login credentials");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (emailChangeNotice) {
    const isStep1 = emailChangeNotice.step === "pending_second_email";

    return (
      <div className="flex flex-col min-h-screen px-6 py-8 justify-between max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex w-full">
          <button 
            onClick={() => setEmailChangeNotice(null)}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            title="Back to login"
          >
            <ChevronLeft className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Content Card */}
        <div className="flex flex-col items-center text-center my-auto py-6">
          {/* Badge Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
            isStep1 
              ? "bg-blue-50 text-[#2d73f5] ring-8 ring-blue-50/50" 
              : "bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50"
          }`}>
            {isStep1 ? (
              <Mail className="w-10 h-10 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-10 h-10" />
            )}
          </div>

          {/* Progress / Status Tag */}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 ${
            isStep1 
              ? "bg-blue-100/80 text-blue-700" 
              : "bg-emerald-100/80 text-emerald-700"
          }`}>
            {isStep1 ? "Step 1 of 2 Complete" : "Email Change Completed"}
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            {emailChangeNotice.title}
          </h1>

          <p className="text-sm font-semibold text-[#2d73f5] mb-4">
            {emailChangeNotice.subtitle}
          </p>

          <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-sm">
            {emailChangeNotice.message}
          </p>

          {emailChangeNotice.detail && (
            <div className={`p-4 rounded-2xl text-xs text-left mb-6 w-full ${
              isStep1 ? "bg-amber-50/80 border border-amber-200 text-amber-800" : "bg-gray-50 border border-gray-200 text-gray-600"
            }`}>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{emailChangeNotice.detail}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3 mt-2">
            {isStep1 ? (
              <button
                type="button"
                onClick={() => setEmailChangeNotice(null)}
                className="w-full text-white font-bold text-base py-3.5 rounded-full bg-[#2d73f5] hover:bg-[#2d73f5]/90 transition-colors shadow-sm cursor-pointer"
              >
                Return to Login
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEmailChangeNotice(null)}
                  className="w-full text-white font-bold text-base py-3.5 rounded-full bg-[#2d73f5] hover:bg-[#2d73f5]/90 transition-colors shadow-sm cursor-pointer"
                >
                  Sign In with New Email
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                      await handlePostLoginRedirect(session.user.id, session);
                    } else {
                      setEmailChangeNotice(null);
                    }
                  }}
                  className="w-full text-gray-700 font-semibold text-sm py-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Continue to App
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">FlightCrew &bull; Security &amp; Verification</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      {/* Header */}
      <div className="flex w-full">
        <button 
          onClick={() => router.push('/welcome')}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Titles */}
      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Hey,<br />
          Welcome Back
        </h1>
        <p className="text-xs text-gray-500 mt-2">Please login to continue</p>
        
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Form */}
      <form className="flex flex-col gap-4 flex-1" noValidate onSubmit={handleLogin}>
        
        {/* Email */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1.5 ml-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-[10px] font-bold">
                @
              </div>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                const target = e.target as HTMLInputElement;
                if (target.value === '') {
                  target.setCustomValidity('Please fill out this field.');
                } else if (!target.value.includes('@')) {
                  target.setCustomValidity(`Please include an '@' in the email address. '${target.value}' is missing an '@'.`);
                } else {
                  target.setCustomValidity('');
                }
              }}
              placeholder="email@example.com" 
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] bg-[#edf2f7] bg-opacity-40"
              required
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.value === '') {
                  target.setCustomValidity('Please fill out this field.');
                } else if (!target.value.includes('@')) {
                  target.setCustomValidity(`Please include an '@' in the email address. '${target.value}' is missing an '@'.`);
                } else {
                  target.setCustomValidity('');
                }
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1.5 ml-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                const target = e.target as HTMLInputElement;
                target.setCustomValidity(target.value === '' ? 'Please fill out this field.' : '');
              }}
              placeholder="••••••••" 
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] bg-[#edf2f7] bg-opacity-40"
              required
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                target.setCustomValidity(target.value === '' ? 'Please fill out this field.' : '');
              }}
            />
            <button 
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <Eye className="w-5 h-5 text-gray-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div className="flex justify-end mt-1">
          <Link href="/forgotPassword" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Buttons */}
        <div className="mt-6 w-full">
          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-bold text-lg py-3.5 rounded-full transition-colors ${isLoading ? 'bg-[#85b0fa] cursor-not-allowed' : 'bg-[#2d73f5] hover:bg-[#2d73f5]/90'}`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">Don&apos;t have an account? </span>
          <Link
            href={
              typeof window !== "undefined" && window.location.search
                ? `/register${window.location.search}`
                : "/register"
            }
            className="text-xs text-[#0f172a] font-bold hover:underline"
          >
            Signup
          </Link>
        </div>

      </form>
    </div>
  );
}
