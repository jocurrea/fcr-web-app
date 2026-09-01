"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  User,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
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
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  // Upload helper for both File and Blob
  const uploadImageBlobOrFile = async (fileOrBlob: File | Blob, localPreviewUrl: string) => {
    setPhotoPreview(localPreviewUrl);
    setTouched(prev => ({ ...prev, photo: true }));
    setIsUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const fileExt = fileOrBlob instanceof File ? (fileOrBlob.name.split('.').pop() || 'jpg') : 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `avatars/${userData.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, fileOrBlob, { upsert: true });

        if (uploadError) {
          console.warn("Storage bucket upload fallback:", uploadError);
          try {
            localStorage.setItem("userProfilePhoto", localPreviewUrl);
          } catch (storageErr) {
            console.warn(storageErr);
          }
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            try {
              localStorage.setItem("userProfilePhoto", publicUrlData.publicUrl);
            } catch (storageErr) {
              console.warn(storageErr);
            }
            setPhotoPreview(publicUrlData.publicUrl);

            await supabase
              .from('users')
              .update({ profileImage: publicUrlData.publicUrl })
              .eq('id', userData.user.id);
          }
        }
      } else {
        try {
          localStorage.setItem("userProfilePhoto", localPreviewUrl);
        } catch (storageErr) {
          console.warn(storageErr);
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
      try {
        localStorage.setItem("userProfilePhoto", localPreviewUrl);
      } catch (storageErr) {
        console.warn(storageErr);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Photo Selection Handler for both Gallery and Camera inputs
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Maximum allowed size is 10MB.");
      if (e.target) e.target.value = "";
      return;
    }

    // Instant Base64 preview & storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhotoPreview(dataUrl);
        setTouched(prev => ({ ...prev, photo: true }));
        try {
          localStorage.setItem("userProfilePhoto", dataUrl);
        } catch (err) {
          console.warn("Local storage write error:", err);
        }
      }
    };
    reader.readAsDataURL(file);

    const localUrl = URL.createObjectURL(file);
    if (e.target) e.target.value = "";
    await uploadImageBlobOrFile(file, localUrl);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
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
      console.error("Error saving personal details:", err);
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

        {/* 2. Title, 6-Segment Progress Bar (2 segments blue), Subtitle & Description */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Personal Details
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

          <h2 className="text-base font-bold text-gray-900 mt-1">
            Tell us who you are
          </h2>

          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Add your name and a clear profile photo so other aviation professionals can identify you.
          </p>
        </div>

        {/* 3. Form Content */}
        <div className="flex flex-col gap-6 flex-1">
          
          {/* Avatar Section & Action Buttons (Camera / Gallery) */}
          <div className="flex flex-col items-center justify-center py-2">
            {/* Hidden File Input for Gallery */}
            <input
              id="personal-gallery-input"
              type="file"
              ref={galleryInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              style={{ display: "none" }}
            />

            {/* Hidden File Input for Camera with capture attribute */}
            <input
              id="personal-camera-input"
              type="file"
              ref={cameraInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              capture="user"
              style={{ display: "none" }}
            />

            {/* Solid Dark Gray Avatar Circle - Clickable */}
            <div className="relative">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={cn(
                  "w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#1e293b] flex items-center justify-center relative overflow-hidden shadow-sm transition-all cursor-pointer hover:opacity-90",
                  photoPreview ? "border-2 border-[#1d4ed8]" : ""
                )}
                title="Click to upload photo"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-14 h-14 text-white stroke-[1.5]" />
                )}

                {/* Uploading spinner overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </button>
            </div>

            {/* Two Outline Buttons: Camera & Gallery */}
            <div className="flex items-center gap-3 mt-4 w-full max-w-xs justify-center">
              {/* Button 1: Camera */}
              <button
                type="button"
                onClick={handleCameraClick}
                className="flex-1 py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" />
                <span>Camera</span>
              </button>

              {/* Button 2: Gallery */}
              <button
                type="button"
                onClick={handleGalleryClick}
                className="flex-1 py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Gallery</span>
              </button>
            </div>

            {/* Note text below buttons */}
            <p className="text-xs text-gray-400 mt-2.5 text-center">
              You can crop the photo before saving it.
            </p>

            {touched.photo && !isPhotoValid && (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Profile picture is required.
              </p>
            )}
          </div>

          {/* First Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="firstName" className="font-semibold text-gray-900 text-sm">
                First name <span className="text-red-500">*</span>
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
              placeholder="Enter your first name"
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
                Last name <span className="text-red-500">*</span>
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
              placeholder="Enter your last name"
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
