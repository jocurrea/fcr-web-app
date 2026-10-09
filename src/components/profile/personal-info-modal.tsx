"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  handleNumericKeyDown,
  sanitizeInteger,
  validateChildren,
} from "@/lib/validation/numeric-rules";
import {
  getMinAgeDateString,
  validateDateOfBirth,
} from "@/lib/validation/date-rules";
import { savePersonalInfoAction } from "@/actions/profile";

export function PersonalInfoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<"pilot" | "crew">("pilot");
  const [employmentStatus, setEmploymentStatus] = useState("employed");
  const [civilStatus, setCivilStatus] = useState("single");
  const [children, setChildren] = useState("");
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);

  // FIX-07 Role Dependency Safeguard modal state
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [pendingTargetRole, setPendingTargetRole] = useState<"pilot" | "crew" | null>(null);
  const [purgeDataPending, setPurgeDataPending] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const maxDate18YearsAgo = getMinAgeDateString(18);

  // Load draft / local info on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onboarding_personal");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === "pilot" || parsed.role === "crew") {
            setRole(parsed.role);
          }
          if (parsed.employmentStatus) setEmploymentStatus(parsed.employmentStatus);
          if (parsed.civilStatus) setCivilStatus(parsed.civilStatus);
          if (parsed.children !== undefined) setChildren(String(parsed.children));
          if (parsed.dateOfBirth || parsed.dob) setDateOfBirth(parsed.dateOfBirth || parsed.dob);
        }
      }
    } catch (e) {
      console.warn("Failed to read draft from storage:", e);
    }
  }, []);

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

  /**
   * FIX-07 Acceptance Criteria 2:
   * Role Dependency Safeguard: Warn user via confirmation modal that changing roles
   * will purge incompatible license/flight hour data before committing changes.
   */
  const handleRoleSelectAttempt = (newRole: "pilot" | "crew") => {
    if (newRole === role) return;

    if (role === "pilot" && newRole === "crew") {
      // Trigger confirmation modal warning before switching
      setPendingTargetRole("crew");
      setShowRoleConfirmModal(true);
    } else {
      // Switching from crew to pilot
      setRole(newRole);
      setPurgeDataPending(false);
    }
  };

  const handleConfirmRoleChange = () => {
    if (pendingTargetRole) {
      setRole(pendingTargetRole);
      setPurgeDataPending(true);
    }
    setShowRoleConfirmModal(false);
    setPendingTargetRole(null);
  };

  const handleCancelRoleChange = () => {
    setShowRoleConfirmModal(false);
    setPendingTargetRole(null);
  };

  const handleSave = async () => {
    if (dobError || childrenError) {
      setToast({
        message: "Please fix validation errors before saving.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    setToast(null);

    try {
      // 1. Update draft in localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onboarding_personal");
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          "onboarding_personal",
          JSON.stringify({
            ...parsed,
            role,
            employmentStatus,
            civilStatus,
            dateOfBirth,
            children,
            ...(role === "crew" && purgeDataPending
              ? { totalFlightHours: "", flightHours: "", licenses: [] }
              : {}),
          })
        );

        if (role === "crew" && purgeDataPending) {
          localStorage.removeItem("onboarding_licenses");
        }
      }

      // 2. Invoke server action with purge safeguards
      const res = await savePersonalInfoAction({
        role,
        employmentStatus,
        civilStatus,
        dateOfBirth,
        children,
        purgeIncompatibleData: purgeDataPending,
      });

      if (!res.success) {
        setToast({
          message: res.error || "Failed to save personal information.",
          type: "error",
        });
        setIsSaving(false);
        return;
      }

      setToast({
        message:
          res.purged
            ? "Personal info saved! Incompatible pilot data was purged successfully."
            : "Personal information saved successfully!",
        type: "success",
      });

      setPurgeDataPending(false);
      setTimeout(() => {
        setIsOpen(false);
      }, 1000);
    } catch (err: any) {
      setToast({
        message: err?.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          Edit Personal Info
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] min-h-[440px] flex flex-col justify-between">
          <DialogHeader>
            <DialogTitle>Personal Information (Perfil - Personal)</DialogTitle>
          </DialogHeader>

          {/* Toast Notification */}
          {toast && (
            <div
              role="alert"
              className={cn(
                "p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all",
                toast.type === "error"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              <div className="flex items-center gap-2">
                {toast.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
            </div>
          )}

          <div className="grid gap-5 py-4 flex-grow">
            {/* FIX-07: Role Selector (Pilot / Crew) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Role</Label>
              <div className="col-span-3">
                <div className="flex bg-gray-100 p-1 rounded-full items-center">
                  <button
                    type="button"
                    onClick={() => handleRoleSelectAttempt("pilot")}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-semibold rounded-full transition-all text-center",
                      role === "pilot"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Pilot
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelectAttempt("crew")}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-semibold rounded-full transition-all text-center",
                      role === "crew"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Crew
                  </button>
                </div>
                {purgeDataPending && role === "crew" && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Incompatible pilot licenses &amp; flight hours will be purged on save.
                  </p>
                )}
              </div>
            </div>

            {/* Employment Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Employment Status
              </Label>
              <div className="col-span-3">
                <Select value={employmentStatus} onValueChange={(val) => setEmploymentStatus(val || "employed")}>
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

            {/* Civil Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="civil" className="text-right">
                Civil Status
              </Label>
              <div className="col-span-3">
                <Select value={civilStatus} onValueChange={(val) => setCivilStatus(val || "single")}>
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

            {/* Date of Birth */}
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

            {/* Children */}
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

          <DialogFooter className="sm:justify-end mt-4 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !!childrenError || !!dobError}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIX-07 Role Dependency Safeguard Alert Modal */}
      <ConfirmationModal
        isOpen={showRoleConfirmModal}
        onClose={handleCancelRoleChange}
        onConfirm={handleConfirmRoleChange}
        title="Role Dependency Safeguard: Change Role?"
        description="Switching your role from Pilot to Cabin Crew will purge incompatible license and total flight hour data before committing changes. Are you sure you want to proceed?"
        confirmText="Confirm Role Change"
        cancelText="Cancel"
        isDestructive={true}
        icon="alert"
      />
    </>
  );
}
