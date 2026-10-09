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
import { AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTodayDateString,
  validateExperienceDates,
} from "@/lib/validation/date-rules";
import { saveCareerExperienceAction } from "@/actions/profile";

export function CareerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrentJob, setIsCurrentJob] = useState(false);

  const [dateError, setDateError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val || (!isCurrentJob && endDate)) {
      const res = validateExperienceDates(val, isCurrentJob ? null : endDate, false);
      setDateError(res.error);
    } else {
      setDateError(null);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    const res = validateExperienceDates(startDate, val, false);
    setDateError(res.error);
  };

  const handleCurrentJobToggle = (checked: boolean) => {
    setIsCurrentJob(checked);
    if (checked) {
      setEndDate("");
      const res = validateExperienceDates(startDate, null, false);
      setDateError(res.error);
    } else {
      if (endDate) {
        const res = validateExperienceDates(startDate, endDate, false);
        setDateError(res.error);
      }
    }
  };

  const handleSave = async () => {
    setGeneralError(null);

    if (!company.trim() || !role.trim()) {
      setGeneralError("Company name and role title are required.");
      return;
    }

    if (!startDate) {
      setDateError("Start date is required.");
      return;
    }

    const res = validateExperienceDates(startDate, isCurrentJob ? null : endDate, true);
    if (!res.isValid) {
      setDateError(res.error);
      return;
    }

    // Persist experience draft locally
    try {
      if (typeof window !== "undefined") {
        const existing = localStorage.getItem("onboarding_work");
        const parsed = existing ? JSON.parse(existing) : {};
        const experiences = Array.isArray(parsed.experiences) ? parsed.experiences : [];
        experiences.push({
          company: company.trim(),
          title: role.trim(),
          startDate,
          endDate: isCurrentJob ? null : (endDate || null),
          isCurrent: isCurrentJob,
        });
        localStorage.setItem(
          "onboarding_work",
          JSON.stringify({ ...parsed, experiences })
        );
      }
    } catch (e) {
      console.warn("Could not save career experience draft:", e);
    }

    try {
      const resServer = await saveCareerExperienceAction({
        company: company.trim(),
        role: role.trim(),
        startDate,
        endDate: isCurrentJob ? null : (endDate || null),
      });

      if (!resServer.success) {
        setGeneralError(resServer.error || "Failed to save career experience.");
        return;
      }
    } catch (err: any) {
      console.warn("Server action notice:", err);
    }

    setToastMessage("Career experience saved successfully!");
    setTimeout(() => {
      setIsOpen(false);
      setToastMessage(null);
      setCompany("");
      setRole("");
      setStartDate("");
      setEndDate("");
      setIsCurrentJob(false);
      setDateError(null);
    }, 1000);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          Edit Career Experience
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Experience (Perfil - Career)</DialogTitle>
          </DialogHeader>

          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {generalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company</Label>
              <Input
                id="companyName"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Delta Airlines"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="roleTitle">Role / Title</Label>
              <Input
                id="roleTitle"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. First Officer B737"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expStart">Start Date</Label>
              <Input
                id="expStart"
                type="date"
                max={todayStr}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className={cn("rounded-xl", dateError && !endDate ? "border-red-500" : "")}
              />
              <span className="text-gray-400 text-xs">Cannot exceed current date</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="expEnd">End Date</Label>
                <label className="text-xs text-gray-500 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCurrentJob}
                    onChange={(e) => handleCurrentJobToggle(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Currently working here</span>
                </label>
              </div>
              <Input
                id="expEnd"
                type="date"
                min={startDate || undefined}
                disabled={isCurrentJob}
                value={isCurrentJob ? "" : endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                placeholder={isCurrentJob ? "Present" : undefined}
                className={cn("rounded-xl", dateError ? "border-red-500" : "")}
              />
              {isCurrentJob && (
                <span className="text-gray-400 text-xs">Handled as current job (nullable End Date)</span>
              )}
            </div>

            {dateError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{dateError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-end gap-2">
            <DialogClose render={<Button type="button" variant="secondary" />}>
              Close
            </DialogClose>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!!dateError}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
