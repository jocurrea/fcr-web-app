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
  validateChildren,
} from "@/lib/validation/numeric-rules";
import {
  getMinAgeDateString,
  validateDateOfBirth,
} from "@/lib/validation/date-rules";

export function PersonalInfoModal() {
  const [children, setChildren] = useState("");
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const maxDate18YearsAgo = getMinAgeDateString(18);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateOfBirth(val);
    const { error } = validateDateOfBirth(val, false);
    setDobError(error);
  };

  const handleChildrenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeInteger(e.target.value);
    setChildren(value);
    const { error } = validateChildren(value);
    setChildrenError(error);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Personal Info
      </DialogTrigger>
      {/* QA Fix: Expand width/height of modal so Selectors do not collapse */}
      <DialogContent className="sm:max-w-[500px] min-h-[380px] flex flex-col justify-between">
        <DialogHeader>
          <DialogTitle>Personal Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4 flex-grow">
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Employment Status
            </Label>
            <div className="col-span-3">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Employment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="self-employed">Self-employed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="civil" className="text-right">
              Civil Status
            </Label>
            <div className="col-span-3">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Civil Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dob" className="text-right">
                Date of Birth
              </Label>
              <Input
                id="dob"
                type="date"
                max={maxDate18YearsAgo}
                value={dateOfBirth}
                onChange={handleDobChange}
                className={`col-span-3 ${dobError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
            </div>
            {dobError && (
              <div className="grid grid-cols-4 gap-4">
                <div />
                <p className="col-span-3 text-red-500 text-xs mt-0.5">{dobError}</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="children" className="text-right">
                Children
              </Label>
              <Input
                id="children"
                value={children}
                onChange={handleChildrenChange}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => {
                  const pasteData = e.clipboardData.getData("text");
                  if (pasteData && !/^\d+$/.test(pasteData.trim())) {
                    e.preventDefault();
                    const sanitized = sanitizeInteger(pasteData);
                    setChildren(sanitized);
                    const { error } = validateChildren(sanitized);
                    setChildrenError(error || (sanitized === "" ? "Only non-negative whole numbers (0 to 10) are allowed." : null));
                  }
                }}
                placeholder="e.g. 2"
                className={`col-span-3 ${childrenError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                inputMode="numeric"
                maxLength={2}
              />
            </div>
            {childrenError && (
              <div className="grid grid-cols-4 gap-4">
                <div />
                <p className="col-span-3 text-red-500 text-xs mt-0.5">{childrenError}</p>
              </div>
            )}
          </div>

        </div>
        <DialogFooter className="sm:justify-end mt-4">
          <DialogClose render={<Button type="button" variant="secondary" />}>
            Close
          </DialogClose>
          <Button type="button" disabled={!!childrenError || !!dobError}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
