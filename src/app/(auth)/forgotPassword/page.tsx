"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, Mail } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    const successMsg = "A verification link has been sent to your email. Please check your inbox.";
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      alert(successMsg);
    }
  };

  const handleResend = () => {
    setResendStatus("Verification link resent successfully!");
    setTimeout(() => {
      setResendStatus(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      {/* Header */}
      <div className="flex w-full">
        <button 
          onClick={() => (isSubmitted ? router.push("/login") : router.back())}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      {!isSubmitted ? (
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
              Forgot Password
            </h1>
            <p className="text-[11px] text-gray-500 mt-2">Please enter your email to continue</p>
          </div>

          {/* Form */}
          <form className="flex flex-col flex-1" onSubmit={handleSubmit}>
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="John@gmail.com" 
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                />
              </div>
            </div>

            {/* Submit Button positioned at the bottom */}
            <div className="mt-auto pt-8 pb-4">
              <button 
                type="submit"
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-lg py-3.5 rounded-full transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        </>
      ) : (
        /* Success Screen */
        <div className="flex flex-col flex-1">
          {/* Centered Mail / Success Icon */}
          <div className="mt-8 mb-6 flex justify-center">
            <div className="w-16 h-16 bg-[#333333] rounded-lg flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Titles */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Forgot Password
            </h1>
          </div>

          {/* Success Message Banner */}
          <div className="mb-6 p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-2xl text-center leading-relaxed">
            A verification link has been sent to your email. Please check your inbox.
          </div>

          {resendStatus && (
            <div className="mb-4 p-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl text-center">
              {resendStatus}
            </div>
          )}

          {/* Primary Navigation CTA in central/lower area */}
          <div className="mt-auto pt-8 pb-4 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-lg py-3.5 rounded-full transition-colors text-center shadow-sm"
            >
              Back to Login
            </Link>
            <button 
              type="button"
              onClick={handleResend}
              className="w-full bg-transparent hover:bg-gray-100 text-[#1a73e8] font-semibold text-base py-2.5 rounded-full transition-colors text-center"
            >
              Resend email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
