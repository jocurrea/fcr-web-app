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
  expiryDateRaw?: string;
}

interface AddLicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLicense: (license: LicenseData) => void;
  editingLicense?: LicenseData | null;
}

export function AddLicenseModal({ open, onOpenChange, onAddLicense, editingLicense }: AddLicenseModalProps) {
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

  const [isPermanent, setIsPermanent] = useState(false);

  // Derive initial values
  const defaultLicenseVal = editingLicense ? editingLicense.licenseName.split(' - ')[0].toLowerCase() : "";
  const defaultLicenseNumber = editingLicense ? editingLicense.licenseNumber : "";
  const defaultExpiryDateRaw = editingLicense && editingLicense.expiryDateRaw !== "Permanent" && editingLicense.expiryDateRaw !== "N/A" 
    ? editingLicense.expiryDateRaw 
    : "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const licenseNumber = formData.get("licenseNumber") as string || "N/A";
    const expiryDate = isPermanent ? "Permanent" : (formData.get("expiryDate") as string || "N/A");
    const licenseVal = formData.get("licenseVal") as string || "Unknown";

    // Format expiry date simply for the UI
    let formattedExpiry = expiryDate;
    if (expiryDate !== "Permanent") {
      const dateObj = new Date(expiryDate);
      formattedExpiry = isNaN(dateObj.getTime()) 
        ? expiryDate 
        : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      onAddLicense({
        id: editingLicense ? editingLicense.id : Math.random().toString(36).substring(7),
        licenseName: licenseVal.toUpperCase() + " - License",
        licenseNumber,
        expiryDate: formattedExpiry,
        expiryDateRaw: expiryDate
      });
      onOpenChange(false);
      setFrontImagePreview(null);
      setBackImagePreview(null);
      setIsPermanent(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white">
        <DialogHeader className="px-4 py-4 border-b flex flex-row items-center justify-center relative">
          <DialogTitle className="text-xl font-bold text-center w-full">
            {editingLicense ? "Edit license" : "New license"}
          </DialogTitle>
        </DialogHeader>

        <form key={editingLicense?.id || 'new'} onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            
            <div className="space-y-2">
              <Label>License</Label>
              <Select name="licenseVal" defaultValue={defaultLicenseVal || undefined}>
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
                defaultValue={defaultLicenseNumber}
                className="rounded-2xl py-6" 
                required 
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z0-9\-\.]/g, "");
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input 
                  name="expiryDate" 
                  type="date" 
                  defaultValue={defaultExpiryDateRaw}
                  className="rounded-2xl py-6 disabled:opacity-50" 
                  required={!isPermanent}
                  disabled={isPermanent}
                />
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <input 
                  type="checkbox" 
                  id="isPermanent"
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer flex-shrink-0"
                  defaultChecked={editingLicense?.expiryDateRaw === "Permanent"}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                />
                <Label htmlFor="isPermanent" className="text-sm text-gray-700 leading-snug cursor-pointer font-medium select-none">
                  This license is Permanent (No Expiry)
                </Label>
              </div>
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
              {isLoading && <Loader2 className="h-6 w-6 animate-spin text-blue-200" />}
              {editingLicense ? "Save Changes" : "Add License"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
