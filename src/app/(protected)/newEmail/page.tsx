"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function NewEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.back();
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white items-center py-10 px-4">
      <div className="flex flex-col w-full max-w-[400px] flex-1">
        
        {/* Back Button */}
        <div className="w-full flex justify-start mb-24">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#f3f4f6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#1f2937]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Icon & Title */}
        <div className="flex flex-col items-center mb-6 w-full">
          <div className="mb-4 text-[#374151]">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" />
            </svg>
          </div>
          <h1 className="text-[28px] font-extrabold text-[#1f2937] tracking-tight">Change Email</h1>
        </div>

        {/* Form */}
        <form className="flex flex-col w-full flex-1" onSubmit={handleSubmit}>
          
          <div className="w-full mb-1">
            <p className="text-[12px] text-gray-600 mb-2">please enter your new email</p>
            <label className="text-[15px] text-[#374151] mb-1.5 block">Email</label>
          </div>
          
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="w-[22px] h-[22px] rounded-full bg-[#9ca3af] flex items-center justify-center text-white text-[11px] font-bold">
                @
              </div>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="John@gmail.com" 
              className="w-full pl-[46px] pr-4 py-3.5 border border-gray-300 rounded-[24px] text-[15px] text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              required
            />
          </div>

          {/* Submit Button pushed to bottom */}
          <div className="mt-auto pt-8 w-full pb-8">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white font-bold text-[17px] py-3.5 rounded-full transition-colors shadow-sm bg-[#1a73e8] hover:bg-blue-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
