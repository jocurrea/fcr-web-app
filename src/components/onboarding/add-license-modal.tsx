"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Loader2 } from "lucide-react";

export interface LicenseData {
  id: string;
  licenseName: string;
  licenseNumber: string;
  expiryDate: string;
}

interface AddLicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLicense: (license: LicenseData) => void;
}

export function AddLicenseModal({ open, onOpenChange, onAddLicense }: AddLicenseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const frontFileInputRef = useRef<HTMLInputElement>(null);

  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  const handleFrontImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFrontImagePreview(url);
    }
  };

  const handleRemoveFrontImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFrontImagePreview(null);
    if (frontFileInputRef.current) {
      frontFileInputRef.current.value = "";
    }
  };

  const handleBackImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackImagePreview(url);
    }
  };

  const handleRemoveBackImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBackImagePreview(null);
    if (backFileInputRef.current) {
      backFileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const licenseNumber = formData.get("licenseNumber") as string || "N/A";
    const expiryDate = formData.get("expiryDate") as string || "N/A";
    const licenseVal = formData.get("licenseVal") as string || "Unknown";

    // Format expiry date simply for the UI (e.g., "2026-06-11" -> "Jun 26")
    const dateObj = new Date(expiryDate);
    const formattedExpiry = isNaN(dateObj.getTime()) 
      ? expiryDate 
      : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      onAddLicense({
        id: Math.random().toString(36).substring(7),
        licenseName: licenseVal.toUpperCase() + " - License", // Simplification
        licenseNumber,
        expiryDate: formattedExpiry
      });
      onOpenChange(false);
      // Reset form images
      setFrontImagePreview(null);
      setBackImagePreview(null);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white">
        <DialogHeader className="px-4 py-4 border-b flex flex-row items-center justify-center relative">
          <DialogTitle className="text-xl font-bold text-center w-full">
            New license
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            
            <div className="space-y-2">
              <Label>License</Label>
              <Select name="licenseVal">
                <SelectTrigger className="w-full rounded-2xl py-6">
                  <SelectValue placeholder="Select an Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faa">FAA - Federal Aviation Administration</SelectItem>
                  <SelectItem value="easa">EASA - European Union Aviation Safety Agency</SelectItem>
                  <SelectItem value="icao">ICAO - International Civil Aviation Organitation</SelectItem>
                  <SelectItem value="tcca">TCCA - Transport Canada Civil Aviation</SelectItem>
                  <SelectItem value="caac">CAAC - Civil Aviation Administration of China</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Type</Label>
              <Select>
                <SelectTrigger className="w-full rounded-2xl py-6">
                  <SelectValue placeholder="Select an Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abpl">ABPL - Aerostatic Balloon Pilot License</SelectItem>
                  <SelectItem value="cfi">CFI - Certificate of Flight Instructor</SelectItem>
                  <SelectItem value="spl-sport">SPL - Sport Pilot License</SelectItem>
                  <SelectItem value="hpl">HPL - Helicopter Pilot License</SelectItem>
                  <SelectItem value="gpl">GPL - Glider Pilot License</SelectItem>
                  <SelectItem value="atpl">ATPL - Airline Transport Pilot License</SelectItem>
                  <SelectItem value="cpl">CPL - Commercial Pilot License</SelectItem>
                  <SelectItem value="lapl">LAPL - Light Airplane Pilot License</SelectItem>
                  <SelectItem value="ppl">PPL - Private Pilot License</SelectItem>
                  <SelectItem value="spl-student">SPL - Student Pilot License</SelectItem>
                  <SelectItem value="flight-attendant">Flight Attendant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Number</Label>
              <Input 
                name="licenseNumber" 
                placeholder="1202193010" 
                className="rounded-2xl py-6" 
                required 
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              {/* Native date input for mobile-friendly picker */}
              <Input name="expiryDate" type="date" className="rounded-2xl py-6" required />
            </div>

            <div className="space-y-2">
              <Label>License Front Image</Label>
              <div 
                onClick={() => frontFileInputRef.current?.click()}
                className="mt-2 flex justify-center items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden"
                style={{ minHeight: "160px" }}
              >
                {frontImagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={frontImagePreview} 
                      alt="Front License Preview" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFrontImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={frontFileInputRef}
                  onChange={handleFrontImageChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>License Back Image</Label>
              <div 
                onClick={() => backFileInputRef.current?.click()}
                className="mt-2 flex justify-center items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden"
                style={{ minHeight: "160px" }}
              >
                {backImagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={backImagePreview} 
                      alt="Back License Preview" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveBackImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={backFileInputRef}
                  onChange={handleBackImageChange}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-white">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-blue-200" />
                </>
              ) : (
                "Add License"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
