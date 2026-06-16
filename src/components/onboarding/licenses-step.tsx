"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AddLicenseModal, type LicenseData } from "./add-license-modal";
import { Trash2 } from "lucide-react";

interface LicensesStepProps {
  onNext: () => void;
}

export function LicensesStep({ onNext }: LicensesStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [licenses, setLicenses] = useState<LicenseData[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_licenses");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("onboarding_licenses", JSON.stringify(licenses));
  }, [licenses]);

  const handleAddLicense = (newLicense: LicenseData) => {
    setLicenses((prev) => [...prev, newLicense]);
  };

  const handleDeleteLicense = (id: string) => {
    setLicenses((prev) => prev.filter(l => l.id !== id));
  };

  return (
    <div className="flex flex-col flex-1 h-full mt-6">
      <div className="flex-1 overflow-y-auto pb-24 px-2">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-medium text-gray-900">Licenses List</h2>
          <Button 
            variant="outline" 
            className="text-blue-500 border-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-full px-6"
            onClick={() => setIsModalOpen(true)}
          >
            New License
          </Button>
        </div>

        {licenses.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500 text-sm">No license added yet!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {licenses.map((license) => (
              <div key={license.id} className="border rounded-2xl p-4 flex flex-col relative bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-gray-900">{license.licenseNumber}</span>
                  <span className="text-sm font-medium text-gray-700">{license.expiryDate}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-gray-500 pr-8">{license.licenseName}</span>
                  <button 
                    onClick={() => handleDeleteLicense(license.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 sm:backdrop-blur-none">
        <Button 
          onClick={onNext}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          Next
        </Button>
      </div>

      <AddLicenseModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onAddLicense={handleAddLicense}
      />
    </div>
  );
}
