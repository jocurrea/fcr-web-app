"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/validation/password-rules";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handle hash fragments from Supabase recovery redirect
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).catch((err) => {
          console.warn("Session set notice:", err);
        });
      }
    }

    // Handle code query param
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch((err) => {
        console.warn("Code exchange notice:", err);
      });
    }

    const errorDesc = searchParams.get("error_description");
    if (errorDesc) {
      setError(errorDesc.replace(/\+/g, " "));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.error || "Password does not meet security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      {/* Header */}
      <div className="flex w-full">
        <button
          onClick={() => (isSuccess ? router.push("/login") : router.back())}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      {!isSuccess ? (
        <>
          {/* Centered Lock Icon */}
          <div className="mt-8 mb-6 flex justify-center">
            <div className="w-16 h-16 bg-[#333333] rounded-lg flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Titles */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Reset Password
            </h1>
            <p className="text-[12px] text-gray-500 mt-2">
              Enter and confirm your new password below.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="flex flex-col flex-1" onSubmit={handleSubmit}>
            {/* New Password */}
            <div className="flex flex-col mb-4">
              <label className="text-sm text-gray-600 mb-1.5 ml-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 8 characters"
                  className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 ml-2">
                Min 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special char.
              </p>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col mb-6">
              <label className="text-sm text-gray-600 mb-1.5 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter your password"
                  className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-auto pt-8 pb-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-lg py-3.5 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </button>
            </div>
          </form>
        </>
      ) : (
        /* Success Screen */
        <div className="flex flex-col flex-1">
          <div className="mt-8 mb-6 flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Password Updated!
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
          </div>

          <div className="mt-auto pt-8 pb-4">
            <Link
              href="/login"
              className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-lg py-3.5 rounded-full transition-colors text-center block shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
