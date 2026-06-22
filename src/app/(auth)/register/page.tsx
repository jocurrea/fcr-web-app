"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, EyeOff, Eye } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        localStorage.setItem("current_user_id", data.session.user.id);
      }

      // Successful registration
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
          onClick={() => router.back()}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Titles */}
      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Lets's<br />
          Get Started
        </h1>
        <p className="text-xs text-gray-500 mt-2">Please fill the details to create an account</p>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="John@gmail.com" 
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
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
              placeholder="*******" 
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
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

        {/* Terms */}
        <div className="mt-8 flex items-start gap-2">
          <input 
            type="checkbox" 
            id="terms" 
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
            required
          />
          <label htmlFor="terms" className="text-[10px] text-gray-600">
            I agree to the <Link href="#" className="text-blue-500 hover:underline">Terms & Conditions</Link>, <Link href="#" className="text-blue-500 hover:underline">Community Guidelines</Link> and <Link href="#" className="text-blue-500 hover:underline">Privacy Policy</Link>
          </label>
        </div>

        {/* Buttons */}
        <div className="mt-2 w-full">
          <button 
            type="submit"
            disabled={isLoading || !termsAccepted}
            className={`w-full text-white font-bold text-lg py-3.5 rounded-full transition-colors ${(isLoading || !termsAccepted) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6ea1ed] hover:bg-[#5b8cdd]'}`}
          >
            {isLoading ? 'Registering...' : 'Signup'}
          </button>
        </div>

        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">Already have an account! </span>
          <Link href="/login" className="text-xs text-[#0f172a] font-bold hover:underline">
            Login
          </Link>
        </div>

      </form>
    </div>
  );
}
