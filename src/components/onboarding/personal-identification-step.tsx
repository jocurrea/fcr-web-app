"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Camera, Upload, User, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PersonalIdentificationStepProps {
  onNext?: (data: { firstName: string; lastName: string; photoUrl: string }) => void;
  onBack?: () => void;
}

export function PersonalIdentificationStep({ onNext, onBack }: PersonalIdentificationStepProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState({ firstName: false, lastName: false, photo: false });

  const sanitizeName = (val: string) => val.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');

  useEffect(() => {
    try {
      const savedPhoto = localStorage.getItem("userProfilePhoto");
      if (savedPhoto) {
        setPhotoPreview(savedPhoto);
      }

      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.firstName) setFirstName(sanitizeName(parsed.firstName));
        if (parsed.lastName) setLastName(sanitizeName(parsed.lastName));
      }
    } catch (e) {
      console.error("Error reading saved personal data:", e);
    }
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Maximum allowed size is 5MB.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setTouched(prev => ({ ...prev, photo: true }));
    setIsUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `avatars/${userData.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.warn("Storage bucket upload fallback:", uploadError);
          localStorage.setItem("userProfilePhoto", localUrl);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            localStorage.setItem("userProfilePhoto", publicUrlData.publicUrl);
            setPhotoPreview(publicUrlData.publicUrl);

            await supabase
              .from('users')
              .update({ profileImage: publicUrlData.publicUrl })
              .eq('id', userData.user.id);
          }
        }
      } else {
        localStorage.setItem("userProfilePhoto", localUrl);
      }
    } catch (err) {
      console.error("Upload error:", err);
      localStorage.setItem("userProfilePhoto", localUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const isFirstNameValid = firstName.trim().length >= 2;
  const isLastNameValid = lastName.trim().length >= 2;
  const isPhotoValid = Boolean(photoPreview);
  const isFormValid = isFirstNameValid && isLastNameValid && isPhotoValid;

  const handleNextClick = async () => {
    setTouched({ firstName: true, lastName: true, photo: true });

    if (!isFormValid || isSaving || isUploading) return;

    setIsSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};

      const updated = {
        ...parsed,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        category: "aviation_professional",
        role: "aviation_professional"
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("users").upsert({
          id: session.user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          ...(photoPreview ? { profileImage: photoPreview } : {}),
          accountType: "aviation_professional"
        }, { onConflict: "id" });
      }

      if (onNext) {
        onNext({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          photoUrl: photoPreview || ""
        });
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving personal identification:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col mx-auto max-w-xl min-h-[100dvh] px-6 py-6">

        {/* 1. Top Bar: Left Back Button + Centered Subtle Logo */}
        <div className="relative flex items-center justify-center w-full pt-1 pb-5 min-h-[44px]">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50 cursor-pointer z-10"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[215px] sm:w-[245px] h-auto object-contain"
          />
        </div>

        {/* 2. Title, 6-Segment Progress Bar (2 segments blue) & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Personal Identification
          </h1>

          {/* 6-Segment Progress Bar: Segments 1 & 2 blue, 3, 4, 5 & 6 gray */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
          </div>

          <p className="text-sm text-gray-500">
            Enter your full legal name and upload a profile picture.
          </p>
        </div>

        {/* 3. Form Content */}
        <div className="flex flex-col gap-6 flex-1">
          
          {/* Avatar Image Picker */}
          <div className="flex flex-col items-center justify-center py-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center relative cursor-pointer group transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30",
                photoPreview
                  ? "border-2 border-[#1d4ed8] overflow-hidden"
                  : touched.photo && !isPhotoValid
                    ? "border-2 border-dashed border-red-400 bg-red-50/50"
                    : "border-2 border-dashed border-gray-300 hover:border-[#1d4ed8] bg-gray-50 hover:bg-blue-50/30"
              )}
            >
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-[#1d4ed8] transition-colors">
                  <User className="w-10 h-10 mb-1 stroke-[1.5]" />
                  <span className="text-[11px] font-semibold">Add Photo</span>
                </div>
              )}

              {/* Camera Badge on Bottom-Right */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shadow-md border-2 border-white">
                <Camera className="w-4 h-4" />
              </div>
            </button>

            <p className="text-xs text-gray-500 mt-2.5 text-center">
              Tap to upload a profile photo from your camera or gallery
            </p>

            {touched.photo && !isPhotoValid && (
              <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Profile picture is required.
              </p>
            )}
          </div>

          {/* First Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="firstName" className="font-semibold text-gray-900 text-sm">
                First Name <span className="text-red-500">*</span>
              </Label>
              {touched.firstName && !isFirstNameValid && (
                <span className="text-xs text-red-600 font-medium">First name is required</span>
              )}
            </div>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(sanitizeName(e.target.value))}
              onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
              placeholder="e.g. Alexander"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.firstName && !isFirstNameValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
          </div>

          {/* Last Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="lastName" className="font-semibold text-gray-900 text-sm">
                Last Name <span className="text-red-500">*</span>
              </Label>
              {touched.lastName && !isLastNameValid && (
                <span className="text-xs text-red-600 font-medium">Last name is required</span>
              )}
            </div>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(sanitizeName(e.target.value))}
              onBlur={() => setTouched(prev => ({ ...prev, lastName: true }))}
              placeholder="e.g. Wright"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.lastName && !isLastNameValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
          </div>

        </div>

        {/* 4. Bottom Next Button */}
        <div className="pb-8 pt-4">
          <button
            type="button"
            onClick={handleNextClick}
            disabled={!isFormValid || isSaving || isUploading}
            className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
              isFormValid && !isSaving && !isUploading
                ? "bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer"
                : "bg-[#85b0fa] cursor-not-allowed opacity-90"
            }`}
          >
            {isSaving || isUploading ? "Please wait..." : "Next"}
          </button>
        </div>

      </div>
    </div>
  );
}
