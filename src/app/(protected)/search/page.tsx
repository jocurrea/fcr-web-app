"use client";

import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="max-w-lg mx-auto flex flex-col w-full px-4 pt-8">
      <h1 className="text-left text-[22px] font-medium text-gray-800 mb-6">
        Search People
      </h1>
      
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="John Doe"
          className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-shadow shadow-sm text-gray-800 placeholder-gray-300"
        />
      </div>
    </div>
  );
}
