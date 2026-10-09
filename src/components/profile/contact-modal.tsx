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
import { AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateEmail,
  validatePhone,
  validateContactInfo,
} from "@/lib/validation/contact-rules";
import { saveContactInfoAction } from "@/actions/profile";

interface ToastState {
  message: string;
  type: "error" | "success";
}

export function ContactModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [workCountry, setWorkCountry] = useState("us");

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Load existing contact details on initial mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onboarding_personal");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.phone || parsed.contactPhone) {
            setPhone(parsed.phone || parsed.contactPhone);
          }
          if (parsed.email || parsed.contactEmail) {
            setEmail(parsed.email || parsed.contactEmail);
          }
          if (parsed.workCountry || parsed.selectedCountry) {
            setWorkCountry(parsed.workCountry || parsed.selectedCountry);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load contact details draft:", e);
    }
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    if (phoneError) {
      const res = validatePhone(val, true);
      if (res.isValid) {
        setPhoneError(null);
      }
    }
  };

  const handlePhoneBlur = () => {
    if (phone.trim()) {
      const res = validatePhone(phone, true);
      setPhoneError(res.error);
    } else {
      setPhoneError("Phone number is required.");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) {
      const res = validateEmail(val, true);
      if (res.isValid) {
        setEmailError(null);
      }
    }
  };

  const handleEmailBlur = () => {
    if (email.trim()) {
      const res = validateEmail(email, true);
      setEmailError(res.error);
    } else {
      setEmailError("Email address is required.");
    }
  };

  const handleSave = async () => {
    // 1. Frontend active validation: check phone and email with standard regex
    const validation = validateContactInfo(phone, email, true);
    setPhoneError(validation.phoneError);
    setEmailError(validation.emailError);

    if (!validation.isValid) {
      const errorMsg =
        validation.phoneError ||
        validation.emailError ||
        "Please provide valid contact information before saving.";
      setToast({
        message: errorMsg,
        type: "error",
      });
      // Navigation Block: Modal stays open!
      return;
    }

    setIsSaving(true);
    setToast(null);

    try {
      // 2. Persist locally first so user never experiences silent data loss
      if (typeof window !== "undefined") {
        const existing = localStorage.getItem("onboarding_personal");
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(
          "onboarding_personal",
          JSON.stringify({
            ...parsed,
            phone: phone.trim(),
            email: email.trim(),
            contactPhone: phone.trim(),
            contactEmail: email.trim(),
            workCountry,
          })
        );
      }

      // 3. Call server action for backend validation and persistence
      const result = await saveContactInfoAction({
        phone: phone.trim(),
        email: email.trim(),
        workCountry,
      });

      if (!result.success) {
        // Active Error Handling: Backend rejected payload
        setToast({
          message: result.error || "Backend rejected contact information payload.",
          type: "error",
        });
        // Block modal closure
        setIsSaving(false);
        return;
      }

      setToast({
        message: "Contact information saved successfully!",
        type: "success",
      });

      setTimeout(() => {
        setIsOpen(false);
      }, 1000);
    } catch (err: any) {
      setToast({
        message: err?.message || "An unexpected error occurred while saving.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalClose = () => {
    // Explicit close button allows dismissing
    setPhoneError(null);
    setEmailError(null);
    setToast(null);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Navigation Block: If there's an ongoing validation error from an attempted save, prevent backdrop close
      if (phoneError || emailError) {
        setToast({
          message: "Please correct the contact errors or click Close to cancel.",
          type: "error",
        });
        return;
      }
    }
    setIsOpen(open);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button variant="outline" />}>
          Edit Contact Info
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Contact Information (Perfil - Professional)</DialogTitle>
          </DialogHeader>

          {/* Toast Notification inside modal */}
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
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Phone Field */}
            <div className="space-y-1">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder="+1 234 567 8900"
                  className={cn(
                    "col-span-3",
                    phoneError ? "border-red-500 focus-visible:ring-red-500" : ""
                  )}
                />
              </div>
              {phoneError && (
                <div className="grid grid-cols-4 gap-4">
                  <div />
                  <p className="col-span-3 text-red-500 text-xs mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {phoneError}
                  </p>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="pilot@flightcrew.com"
                  className={cn(
                    "col-span-3",
                    emailError ? "border-red-500 focus-visible:ring-red-500" : ""
                  )}
                />
              </div>
              {emailError && (
                <div className="grid grid-cols-4 gap-4">
                  <div />
                  <p className="col-span-3 text-red-500 text-xs mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {emailError}
                  </p>
                </div>
              )}
            </div>

            {/* Work Country */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="country" className="text-right">
                Work Country
              </Label>
              <div className="col-span-3">
                <Select
                  value={workCountry}
                  onValueChange={(val) => setWorkCountry(val || "us")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="mx">Mexico</SelectItem>
                    <SelectItem value="co">Colombia</SelectItem>
                    <SelectItem value="ve">Venezuela</SelectItem>
                    <SelectItem value="es">Spain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleModalClose}
              disabled={isSaving}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
