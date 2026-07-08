"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, AtSign, Lock, EyeOff, Eye } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        localStorage.setItem("current_user_id", data.session.user.id);
        
        const { data: userRecord } = await supabase
          .from('users')
          .select('onboarded, accounttype')
          .eq('id', data.session.user.id)
          .single();

        if (userRecord?.onboarded) {
          router.push("/home");
        } else if (userRecord?.accounttype === "business") {
          router.push("/onboarding-business");
        } else if (userRecord?.accounttype === "flight_crew") {
          router.push("/onboarding");
        } else {
          router.push("/role-selection");
        }
      } else {
        // Fallback just in case
        router.push("/home");
      }
    } catch (err: any) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      {/* Header */}
      <div className="flex w-full">
        <button 
          onClick={() => router.back()}
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
          <span className="text-xs text-gray-500">Don't have an account! </span>
          <Link href="/register" className="text-xs text-[#0f172a] font-bold hover:underline">
            Signup
          </Link>
        </div>

      </form>
    </div>
  );
}
