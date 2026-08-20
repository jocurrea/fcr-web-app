"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Lock, EyeOff, Eye, AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteToken = searchParams.get("invite") || searchParams.get("code");
  const companyParam = searchParams.get("company");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  // Corporate invite state
  const [invitedCompany, setInvitedCompany] = useState<{ id: string; name: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);

  useEffect(() => {
    async function checkInvite() {
      if (!inviteToken && !companyParam) return;

      setIsCheckingInvite(true);
      setInviteError(null);

      try {
        const queryTarget = companyParam || inviteToken;
        // Attempt to find company by ID or slug
        const { data: company, error: companyErr } = await supabase
          .from("companies")
          .select("id, name")
          .or(`id.eq.${queryTarget},slug.eq.${queryTarget}`)
          .maybeSingle();

        if (companyErr || !company) {
          // If token looks like a mock invite or expired token
          if (queryTarget === "expired" || queryTarget === "invalid") {
            setInviteError("This invitation link is invalid or has expired. You can still create a standard account.");
          } else {
            // Default fallback if not found directly
            setInviteError("The corporate invitation link could not be verified or has expired.");
          }
          setInvitedCompany(null);
        } else {
          setInvitedCompany({ id: company.id, name: company.name });
        }
      } catch {
        setInviteError("The invitation link is invalid or has expired.");
      } finally {
        setIsCheckingInvite(false);
      }
    }

    checkInvite();
  }, [inviteToken, companyParam]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsDuplicateEmail(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords are identical.");
      setIsLoading(false);
      return;
    }

    try {
      const accountType = invitedCompany ? "corporate_member" : "individual";
      const employerName = invitedCompany ? invitedCompany.name : undefined;

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            accountType,
            professionalRole: "Aviation Professional",
            platformRole: "user",
            employer: employerName,
            invited_by_company_id: invitedCompany?.id,
          },
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || authError.status === 422) {
          setIsDuplicateEmail(true);
          setError("This email address is already registered in our platform.");
          return;
        }
        throw authError;
      }

      const userId = data.session?.user.id || data.user?.id;

      if (userId) {
        localStorage.setItem("current_user_id", userId);

        // Scenario 2: Bind user profile to invited Business entity with Pre-linked status
        if (invitedCompany?.id) {
          try {
            await supabase.from("company_members").insert({
              company_id: invitedCompany.id,
              user_id: userId,
              role: "member",
            });
          } catch (err) {
            console.warn("Could not insert company member association directly:", err);
          }
        }
      }

      // Successful registration - proceed to onboarding
      router.push("/role-selection");
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
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

      {/* Titles & Invite Banner */}
      <div className="mt-8 mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Let's<br />
          Get Started
        </h1>
        
        {/* Scenario 1: Corporate Invitation Notice */}
        {invitedCompany ? (
          <div className="mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#2d73f5] shrink-0" />
            <div className="text-xs text-blue-900">
              <span className="font-bold">Corporate Invitation:</span> Registering as a pre-linked member of{" "}
              <span className="font-extrabold text-[#2d73f5]">{invitedCompany.name}</span>.
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-2">
            Create your account as an <span className="font-semibold text-gray-700">Aviation Professional</span>
          </p>
        )}

        {/* Scenario 3: Expired or Invalid Link Notice */}
        {inviteError && (
          <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{inviteError}</p>
              <button 
                type="button" 
                onClick={() => setInviteError(null)}
                className="mt-1 text-[#2d73f5] font-bold underline"
              >
                Continue with standard registration
              </button>
            </div>
          </div>
        )}

        {/* General & Duplicate Email Errors */}
        {error && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {isDuplicateEmail && (
              <div className="mt-1 pt-2 border-t border-red-200 text-xs text-gray-700 flex flex-wrap gap-2 items-center">
                <span>Already have an account?</span>
                <Link href="/login" className="font-bold text-[#2d73f5] hover:underline">
                  Log in here
                </Link>
                <span>or</span>
                <Link href="/reset" className="font-bold text-[#2d73f5] hover:underline">
                  Restore Password
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <form className="flex flex-col gap-4 flex-1" onSubmit={handleRegister}>
        
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
                setError(null);
                setIsDuplicateEmail(false);
              }}
              placeholder="email@example.com" 
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] bg-white"
              required
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] bg-white"
              required
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

        {/* Confirm Password */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1.5 ml-1">Confirm Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] bg-white"
              required
            />
            <button 
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <Eye className="w-5 h-5 text-gray-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-4 flex items-start gap-2">
          <input 
            type="checkbox" 
            id="terms" 
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2d73f5] focus:ring-[#2d73f5]" 
            required
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
            {isLoading ? 'Registering...' : invitedCompany ? 'Join Company & Register' : 'Signup'}
          </button>
        </div>

        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">Already have an account? </span>
          <Link href="/login" className="text-xs text-[#0f172a] font-bold hover:underline">
            Log in
          </Link>
        </div>

      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading signup...</div>}>
      <RegisterForm />
    </Suspense>
  );
}


