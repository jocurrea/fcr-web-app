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
import { cn } from "@/lib/utils";

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
  const [medicalClass, setMedicalClass] = useState<"1st" | "2nd" | "3rd">("1st");
  const [imageError, setImageError] = useState<string | null>(null);

  // Derive initial values
  const defaultLicenseVal = editingLicense 
    ? (
        editingLicense.licenseName.toLowerCase().includes("faa") ? "FAA - Federal Aviation Administration" :
        editingLicense.licenseName.toLowerCase().includes("easa") ? "EASA - European Union Aviation Safety Agency" :
        editingLicense.licenseName.toLowerCase().includes("icao") ? "ICAO - International Civil Aviation Organization" :
        editingLicense.licenseName.toLowerCase().includes("tcca") ? "TCCA - Transport Canada Civil Aviation" :
        editingLicense.licenseName.toLowerCase().includes("caac") ? "CAAC - Civil Aviation Administration of China" :
        editingLicense.licenseName
      )
    : "";

  const [selectedLicense, setSelectedLicense] = useState<string>(defaultLicenseVal);
  const isFaa = selectedLicense.toLowerCase().includes("faa");

  const defaultLicenseNumber = editingLicense ? editingLicense.licenseNumber : "";
  const defaultExpiryDateRaw = editingLicense && editingLicense.expiryDateRaw !== "Permanent" && editingLicense.expiryDateRaw !== "N/A" 
    ? editingLicense.expiryDateRaw 
    : "";

  const [selectedLicenseType, setSelectedLicenseType] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState<string>(defaultLicenseNumber);
  const [medicalValidUntil, setMedicalValidUntil] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>(defaultExpiryDateRaw || "");

  const isFormComplete = Boolean(
    selectedLicense && selectedLicense.trim() !== "" &&
    selectedLicenseType && selectedLicenseType.trim() !== "" &&
    licenseNumber && licenseNumber.trim() !== "" &&
    frontImagePreview &&
    backImagePreview &&
    (isFaa 
      ? Boolean(medicalValidUntil && medicalValidUntil.trim() !== "")
      : (isPermanent || Boolean(expiryDate && expiryDate.trim() !== ""))
    )
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormComplete) {
      setImageError("Please complete all required fields and upload both license photos.");
      return;
    }
    setImageError(null);

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const licenseVal = selectedLicense || (formData.get("licenseVal") as string) || "Unknown";

    let finalExpiryDate = "N/A";
    let formattedExpiry = "N/A";

    if (isFaa) {
      finalExpiryDate = medicalValidUntil || "Permanent";
      if (medicalValidUntil) {
        const dateObj = new Date(medicalValidUntil);
        formattedExpiry = isNaN(dateObj.getTime())
          ? medicalValidUntil
          : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        formattedExpiry = `Class ${medicalClass}`;
      }
    } else {
      finalExpiryDate = isPermanent ? "Permanent" : (expiryDate || "N/A");
      formattedExpiry = finalExpiryDate;
      if (finalExpiryDate !== "Permanent" && finalExpiryDate !== "N/A") {
        const dateObj = new Date(finalExpiryDate);
        formattedExpiry = isNaN(dateObj.getTime()) 
          ? finalExpiryDate 
          : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    }

    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      onAddLicense({
        id: editingLicense ? editingLicense.id : Math.random().toString(36).substring(7),
        licenseName: licenseVal,
        licenseNumber,
        expiryDate: formattedExpiry,
        expiryDateRaw: finalExpiryDate
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
              <Select 
                name="licenseVal" 
                value={selectedLicense || undefined}
                onValueChange={(val) => {
                  if (val) setSelectedLicense(val);
                  setImageError(null);
                }}
              >
                <SelectTrigger className="w-full rounded-2xl py-6">
                  <SelectValue placeholder="Select an Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FAA - Federal Aviation Administration">FAA - Federal Aviation Administration</SelectItem>
                  <SelectItem value="EASA - European Union Aviation Safety Agency">EASA - European Union Aviation Safety Agency</SelectItem>
                  <SelectItem value="ICAO - International Civil Aviation Organization">ICAO - International Civil Aviation Organization</SelectItem>
                  <SelectItem value="TCCA - Transport Canada Civil Aviation">TCCA - Transport Canada Civil Aviation</SelectItem>
                  <SelectItem value="CAAC - Civil Aviation Administration of China">CAAC - Civil Aviation Administration of China</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Type</Label>
              <Select
                name="licenseTypeVal"
                value={selectedLicenseType || undefined}
                onValueChange={(val) => {
                  if (val) setSelectedLicenseType(val);
                }}
              >
                <SelectTrigger className="w-full rounded-2xl py-6">
                  <SelectValue placeholder="Select an Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABPL - Aerostatic Balloon Pilot License">ABPL - Aerostatic Balloon Pilot License</SelectItem>
                  <SelectItem value="CFI - Certificate of Flight Instructor">CFI - Certificate of Flight Instructor</SelectItem>
                  <SelectItem value="SPL - Sport Pilot License">SPL - Sport Pilot License</SelectItem>
                  <SelectItem value="HPL - Helicopter Pilot License">HPL - Helicopter Pilot License</SelectItem>
                  <SelectItem value="GPL - Glider Pilot License">GPL - Glider Pilot License</SelectItem>
                  <SelectItem value="ATPL - Airline Transport Pilot License">ATPL - Airline Transport Pilot License</SelectItem>
                  <SelectItem value="CPL - Commercial Pilot License">CPL - Commercial Pilot License</SelectItem>
                  <SelectItem value="LAPL - Light Airplane Pilot License">LAPL - Light Airplane Pilot License</SelectItem>
                  <SelectItem value="PPL - Private Pilot License">PPL - Private Pilot License</SelectItem>
                  <SelectItem value="SPL - Student Pilot License">SPL - Student Pilot License</SelectItem>
                  <SelectItem value="Flight Attendant">Flight Attendant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Number</Label>
              <Input 
                name="licenseNumber" 
                placeholder="1202193010" 
                value={licenseNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9\-\.]/g, "");
                  setLicenseNumber(val);
                }}
                className="rounded-2xl py-6" 
                required 
              />
            </div>

            {isFaa ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 font-normal leading-relaxed">
                  FAA licenses do not expire. Their validity is based on the associated medical certificate.
                </p>

                <div className="space-y-2">
                  <Label>Medical Certificate Class</Label>
                  <div className="flex gap-3">
                    {(["1st", "2nd", "3rd"] as const).map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setMedicalClass(cls)}
                        className={cn(
                          "flex-1 py-3 text-center rounded-full font-semibold text-sm transition-all border select-none",
                          medicalClass === cls
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "border-blue-500 text-blue-600 bg-white hover:bg-blue-50"
                        )}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalValidUntil">Medical Certificate Valid Until</Label>
                  <Input 
                    id="medicalValidUntil"
                    name="medicalValidUntil" 
                    type="date" 
                    value={medicalValidUntil}
                    onChange={(e) => setMedicalValidUntil(e.target.value)}
                    className="rounded-2xl py-6" 
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input 
                    name="expiryDate" 
                    type="date" 
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
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
            )}

            <div className="space-y-2">
              <Label>License Front Image <span className="text-red-500">*</span></Label>
              <div 
                onClick={() => {
                  setImageError(null);
                  frontFileInputRef.current?.click();
                }}
                className={cn(
                  "mt-2 flex justify-center items-center rounded-2xl border border-dashed bg-gray-50 px-6 py-14 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden",
                  imageError ? "border-red-500 bg-red-50/20" : "border-gray-300"
                )}
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
                  onChange={(e) => {
                    setImageError(null);
                    handleFrontImageChange(e);
                  }}
                />
              </div>
              {imageError && (
                <p className="text-xs text-red-500 font-medium mt-1">{imageError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>License Back Image <span className="text-red-500">*</span></Label>
              <div 
                onClick={() => {
                  setImageError(null);
                  backFileInputRef.current?.click();
                }}
                className={cn(
                  "mt-2 flex justify-center items-center rounded-2xl border border-dashed bg-gray-50 px-6 py-14 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden",
                  imageError && !backImagePreview ? "border-red-500 bg-red-50/20" : "border-gray-300"
                )}
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
                  onChange={(e) => {
                    setImageError(null);
                    handleBackImageChange(e);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-white">
            <Button 
              type="submit" 
              disabled={isLoading || !isFormComplete}
              className={cn(
                "w-full rounded-full py-6 text-lg font-semibold flex items-center justify-center gap-2 transition-all",
                isFormComplete 
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200"
              )}
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
