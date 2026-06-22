"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

interface CompanyProfileStepProps {
  onNext: () => void;
}

export function CompanyProfileStep({ onNext }: CompanyProfileStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  
  const [services, setServices] = useState<string[]>([
    "Pilot Hiring", "Cabin Crew Hiring", "Training", "Maintenance", 
    "Aircraft Charter", "Ground Services", "Dispatch", 
    "Crew Accommodation", "Aviation Software"
  ]);
  const [newService, setNewService] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);

  const [fleet, setFleet] = useState<string[]>([
    "Gulfstream", "Bombardier", "Cessna", "Airbus", "Boeing"
  ]);
  const [newFleet, setNewFleet] = useState("");
  const [isAddingFleet, setIsAddingFleet] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const removeService = (service: string) => {
    setServices(services.filter(s => s !== service));
  };

  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
    }
    setNewService("");
    setIsAddingService(false);
  };

  const removeFleet = (item: string) => {
    setFleet(fleet.filter(f => f !== item));
  };

  const addFleet = () => {
    if (newFleet.trim() && !fleet.includes(newFleet.trim())) {
      setFleet([...fleet, newFleet.trim()]);
    }
    setNewFleet("");
    setIsAddingFleet(false);
  };

  const handleNext = () => {
    // We would normally save data to localStorage here
    onNext();
  };

  return (
    <div className="flex flex-col flex-1 h-full mt-4">
      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 -mx-2">
        <div className="space-y-6">
          
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Logo</Label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleLogoUpload} 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-gray-200 rounded-2xl bg-white h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mt-2">Tap to upload</p>
                    <p className="text-[10px] text-gray-400">JPG, PNG or SVG (max 2MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Company Description</Label>
            <div className="relative">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Pilot Insight Aviation is a global aviation solutions company..."
                className="min-h-[100px] rounded-2xl resize-none text-sm p-4 pb-8 bg-white"
              />
              <span className="absolute bottom-3 right-4 text-[10px] text-gray-400">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Services Offered */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Services Offered</Label>
            <div className="flex flex-wrap gap-2">
              {services.map(service => (
                <div key={service} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 rounded-full text-[13px] text-blue-600 font-medium">
                  {service}
                  <button onClick={() => removeService(service)} className="hover:text-blue-800 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              
              {isAddingService ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addService()}
                    autoFocus
                    className="px-3 py-1 text-[13px] border border-blue-200 rounded-full outline-none focus:border-blue-400 w-28"
                  />
                  <button onClick={addService} className="text-blue-600 p-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingService(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-blue-600 font-semibold hover:bg-blue-50 rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
          </div>

          {/* Fleet Types */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Fleet Types <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {fleet.map(item => (
                <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 rounded-full text-[13px] text-blue-600 font-medium">
                  {item}
                  <button onClick={() => removeFleet(item)} className="hover:text-blue-800 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              
              {isAddingFleet ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newFleet}
                    onChange={(e) => setNewFleet(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFleet()}
                    autoFocus
                    className="px-3 py-1 text-[13px] border border-blue-200 rounded-full outline-none focus:border-blue-400 w-28"
                  />
                  <button onClick={addFleet} className="text-blue-600 p-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingFleet(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-blue-600 font-semibold hover:bg-blue-50 rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 sm:backdrop-blur-none">
        <Button 
          type="button" 
          onClick={handleNext}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
