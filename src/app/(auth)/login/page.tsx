"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, EyeOff, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    cleanResidualParams();
    localStorage.setItem("current_user_id", userId);

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

      // Check onboarded flag (handles numeric 1, boolean true, or strings)
      let isOnboarded =
        userRecord?.onboarded === 1 ||
        userRecord?.onboarded === true ||
        String(userRecord?.onboarded) === "1" ||
        String(userRecord?.onboarded).toLowerCase() === "true" ||
        session?.user?.user_metadata?.onboarded === true;

      const effectiveRole =
        userRecord?.accountType ||
        userRecord?.role ||
        session?.user?.user_metadata?.accountType ||
        "";

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
          }
        }
      }

      // Check resume fallback for flight crew / aviation professionals
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

      // 2. Ruta Correcta: Si el usuario ya tiene su cuenta configurada (onboarded === true),
      // fuerza la redirección directamente hacia el panel principal (/home)
      if (isOnboarded) {
        try {
          document.cookie = "flightcrew_onboarded=true; path=/; max-age=31536000";
          sessionStorage.setItem("flightcrew_onboarded", "true");
          localStorage.setItem("flightcrew_onboarded", "true");
        } catch (e) {}

        window.location.replace("/home");
        return;
      }

      // 3. Ruta de Nuevos Usuarios: La redirección hacia /role-selection debe ser estrictamente
      // exclusiva para usuarios nuevos cuyo registro indique onboarded === false o nulo
      if (effectiveRole === "business") {
        window.location.replace("/onboarding-business");
        return;
      }

      window.location.replace("/role-selection");
    } catch (redirectErr) {
      console.error("[Login] Redirect error:", redirectErr);
      window.location.replace("/home");
    }
  }, [cleanResidualParams]);

  useEffect(() => {
    cleanResidualParams();

    // If an existing session is already active, redirect according to onboarded status
    async function checkExistingSession() {
      try {
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
        window.location.replace("/home");
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
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Form */}
      <form className="flex flex-col gap-4 flex-1" onSubmit={handleLogin}>
        
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

        {/* Terms */}
        <div className="mt-6 flex items-start gap-2">
          <input 
            type="checkbox" 
            id="terms" 
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2d73f5] focus:ring-[#2d73f5]" 
          />
          <label htmlFor="terms" className="text-[10px] text-gray-600">
            I agree to the <Link href="#" className="text-[#2d73f5] hover:underline">Terms & Conditions</Link>, <Link href="#" className="text-[#2d73f5] hover:underline">Community Guidelines</Link> and <Link href="#" className="text-[#2d73f5] hover:underline">Privacy Policy</Link>
          </label>
        </div>

        {/* Buttons */}
        <div className="mt-2 w-full">
          <button 
            type="submit"
            disabled={isLoading || !termsAccepted}
            className={`w-full text-white font-bold text-lg py-3.5 rounded-full transition-colors ${(isLoading || !termsAccepted) ? 'bg-[#85b0fa] cursor-not-allowed' : 'bg-[#2d73f5] hover:bg-[#2d73f5]/90'}`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">Don&apos;t have an account! </span>
          <Link href="/register" className="text-xs text-[#0f172a] font-bold hover:underline">
            Signup
          </Link>
        </div>

      </form>
    </div>
  );
}
