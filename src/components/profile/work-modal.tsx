"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
import {
  handleNumericKeyDown,
  sanitizeInteger,
  validateYearsInIndustry,
} from "@/lib/validation/numeric-rules";

export function WorkModal() {
  const [industryYears, setIndustryYears] = useState("");
  const [industryYearsError, setIndustryYearsError] = useState<string | null>(null);
  const [employmentStatus, setEmploymentStatus] = useState("employed");
  const [medicalClass, setMedicalClass] = useState("1st");

  const handleYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeInteger(e.target.value);
    setIndustryYears(value);
    const { error } = validateYearsInIndustry(value);
    setIndustryYearsError(error);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Work Info
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] min-h-[380px] flex flex-col justify-between">
        <DialogHeader>
          <DialogTitle>Work Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4 flex-grow">
          <div className="space-y-1">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="industryYears" className="text-right">
                Years in Industry
              </Label>
              <Input
                id="industryYears"
                value={industryYears}
                onChange={handleYearsChange}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => {
                  const pasteData = e.clipboardData.getData("text");
                  if (pasteData && !/^\d+$/.test(pasteData.trim())) {
                    e.preventDefault();
                    const sanitized = sanitizeInteger(pasteData);
                    setIndustryYears(sanitized);
                    const { error } = validateYearsInIndustry(sanitized);
                    setIndustryYearsError(
                      error ||
                        (sanitized === ""
                          ? "Only non-negative whole numbers (0 to 65) are allowed."
                          : null)
                    );
                  }
                }}
                placeholder="e.g. 5"
                className={`col-span-3 ${
                  industryYearsError ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
                inputMode="numeric"
                maxLength={2}
              />
            </div>
            {industryYearsError && (
              <div className="grid grid-cols-4 gap-4">
                <div />
                <p className="col-span-3 text-red-500 text-xs mt-0.5">{industryYearsError}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="workStatus" className="text-right">
              Employment Status
            </Label>
            <div className="col-span-3">
              <Select value={employmentStatus} onValueChange={(val) => setEmploymentStatus(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Employment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="seeking_opportunities">Seeking Opportunities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="medClass" className="text-right">
              Medical Class
            </Label>
            <div className="col-span-3">
              <Select value={medicalClass} onValueChange={(val) => setMedicalClass(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Class</SelectItem>
                  <SelectItem value="2nd">2nd Class</SelectItem>
                  <SelectItem value="3rd">3rd Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-end mt-4">
          <DialogClose render={<Button type="button" variant="secondary" />}>
            Close
          </DialogClose>
          <Button type="button" disabled={!!industryYearsError}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
