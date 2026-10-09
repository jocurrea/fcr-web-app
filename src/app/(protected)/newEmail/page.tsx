"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { validateEmail } from "@/lib/validation/contact-rules";
import { cn } from "@/lib/utils";

export default function NewEmailPage() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current authenticated user's email on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          // If no session, route to login
          router.replace("/login");
          return;
        }
        setCurrentEmail(session.user.email);
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadUser();
  }, [router]);

  /**
   * FIX-07 Acceptance Criteria 3:
   * Email Security Flow: Require current password verification before enabling email change.
   * Send security alert to old email and confirmation link to new email.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate inputs
    const trimmedNewEmail = newEmail.trim().toLowerCase();
    const emailValidation = validateEmail(trimmedNewEmail, true);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Please enter a valid new email address.");
      return;
    }

    if (trimmedNewEmail === currentEmail.toLowerCase()) {
      setError("The new email address cannot be the same as your current email address.");
      return;
    }

    if (!currentPassword || currentPassword.trim().length === 0) {
      setError("Please enter your current password to verify your identity.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Security Safeguard: Require current password verification
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password verification failed. Please enter your correct password.");
        setIsSubmitting(false);
        return;
      }

      // 3. Initiate email update via Supabase
      // Supabase sends a confirmation link to the new email and a security notice to the old email
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/profile`
          : undefined;

      const { error: updateError } = await supabase.auth.updateUser(
        { email: trimmedNewEmail },
        { emailRedirectTo: callbackUrl }
      );

      if (updateError) {
        const msg = updateError.message?.toLowerCase() || "";
        if (msg.includes("already registered") || msg.includes("already exists") || updateError.status === 422) {
          setError("This new email address is already registered to another account.");
        } else {
          setError(updateError.message || "Failed to initiate email change. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      // 4. Update contact email draft in local storage for consistency
      if (typeof window !== "undefined") {
        try {
          const draft = localStorage.getItem("onboarding_personal");
          if (draft) {
            const parsed = JSON.parse(draft);
            parsed.contactEmail = trimmedNewEmail;
            localStorage.setItem("onboarding_personal", JSON.stringify(parsed));
          }
        } catch (storageErr) {
          console.warn("Storage update notice:", storageErr);
        }
      }

      // 5. Success State
      setSuccess(true);
    } catch (err: any) {
      console.error("Change email error:", err);
      setError(err?.message || "An unexpected error occurred while updating email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white items-center py-10 px-4">
      <div className="flex flex-col w-full max-w-[420px] flex-1">
        {/* Back Button */}
        <div className="w-full flex justify-start mb-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#f3f4f6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-[#1f2937]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Success View */}
        {success ? (
          <div className="flex flex-col items-center text-center my-auto p-6 bg-blue-50/60 rounded-3xl border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-5 shadow-sm">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
              Verification Dispatched
            </h2>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              For your account security, we have initiated the email update:
            </p>

            <div className="w-full space-y-3 mb-6 text-left">
              <div className="p-3.5 bg-white rounded-2xl border border-blue-100 flex items-start gap-3 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    Confirmation Link
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sent to <span className="font-medium text-gray-900">{newEmail}</span>. Click the link in your inbox to complete the update.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-blue-100 flex items-start gap-3 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    Security Notification
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sent to <span className="font-medium text-gray-900">{currentEmail}</span> alerting that an email change was requested.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/profile")}
              className="w-full text-white font-bold text-sm py-3.5 rounded-full transition-colors shadow-sm bg-[#1a73e8] hover:bg-blue-700"
            >
              Return to Profile
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-6 w-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Mail className="w-7 h-7" />
              </div>
              <h1 className="text-[26px] font-extrabold text-[#1f2937] tracking-tight">
                Change Email Address
              </h1>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                To protect your account against unauthorized changes, please verify your current password.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-3 animate-in fade-in"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            {/* Form */}
            <form className="flex flex-col w-full flex-1" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Current Email (Read-Only) */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-500 mb-1 ml-1">
                    Current Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={isLoadingUser ? "Loading..." : currentEmail}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* New Email */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1 ml-1">
                    New Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new.email@flightcrew.com"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Current Password Verification (Security Safeguard) */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1 ml-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Current Password (Verification)
                    </label>
                    <span className="text-[10px] text-blue-600 font-medium">
                      Required for security
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-auto pt-8 w-full pb-6">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingUser}
                  className={cn(
                    "w-full text-white font-bold text-sm py-3.5 rounded-full transition-colors shadow-sm flex items-center justify-center gap-2",
                    isSubmitting || isLoadingUser
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-[#1a73e8] hover:bg-blue-700"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying &amp; Updating...
                    </>
                  ) : (
                    "Verify Password & Change Email"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
