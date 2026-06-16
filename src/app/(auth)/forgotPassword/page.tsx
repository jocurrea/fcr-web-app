"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending email then navigating back to login
    alert("Password reset link sent to your email!");
    router.push("/login");
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

      {/* Centered Lock Icon */}
      <div className="mt-8 mb-6 flex justify-center">
        <div className="w-16 h-16 bg-[#333333] rounded-lg flex items-center justify-center">
          <Lock className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Titles */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          Forget Password
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
    </div>
  );
}
