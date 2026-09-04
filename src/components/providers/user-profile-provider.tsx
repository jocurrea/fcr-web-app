"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { fetchProfileProgress } from "@/utils/profileCompletion";

export interface UserProfileContextValue {
  profileProgress: number;
  profilePhoto: string | null;
  profileData: any | null;
  accountType: string | null;
  isLoading: boolean;
  refetchProfile: () => Promise<number>;
  setProfileProgress: (progress: number) => void;
  updateProfileData: (data: any, computedProgress?: number) => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profileProgress: 0,
  profilePhoto: null,
  profileData: null,
  accountType: null,
  isLoading: true,
  refetchProfile: async () => 0,
  setProfileProgress: () => {},
  updateProfileData: () => {},
});

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profileProgress, setProfileProgressState] = useState<number>(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [accountType, setAccountType] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("account_type") || localStorage.getItem("accountType");
      if (saved) return saved;
      try {
        const personal = localStorage.getItem("onboarding_personal");
        if (personal) {
          const parsed = JSON.parse(personal);
          if (parsed.category === "business" || parsed.accountType === "business") {
            return "business";
          }
        }
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setProfileProgress = useCallback((progress: number) => {
    setProfileProgressState(progress);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("profile-progress-updated", { detail: progress })
      );
    }
  }, []);

  const updateProfileData = useCallback(
    (data: any, computedProgress?: number) => {
      if (data) {
        setProfileData(data);
      }
      if (typeof computedProgress === "number") {
        setProfileProgressState(computedProgress);
      }
    },
    []
  );

  const refetchProfile = useCallback(async (): Promise<number> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsLoading(false);
        return 0;
      }

      // 1. Explicit architecture requirement: Fetch canonical user data via get_my_profile() RPC
      const { data: myProfile, error: rpcError } = await supabase.rpc(
        "get_my_profile"
      );

      if (!rpcError && myProfile) {
        setProfileData(myProfile);
      }

      // 2. Resolve accountType
      let resolvedType =
        myProfile?.account_type ||
        myProfile?.accountType ||
        session.user.user_metadata?.accountType ||
        null;

      if (!resolvedType) {
        const { data: dbUser } = await supabase
          .from("users")
          .select("accountType")
          .eq("id", session.user.id)
          .maybeSingle();
        if (dbUser?.accountType) {
          resolvedType = dbUser.accountType;
        }
      }

      if (resolvedType) {
        setAccountType(resolvedType);
        if (typeof window !== "undefined") {
          localStorage.setItem("account_type", resolvedType);
        }
      }

      // 3. Compute canonical profile completion percentage (Business accounts do not use completion percentages)
      let progress = 0;
      if (resolvedType !== "business") {
        progress = await fetchProfileProgress(session.user.id, myProfile);
      }
      setProfileProgressState(progress);

      // 4. Resolve profile avatar photo
      const resolvedPhoto =
        myProfile?.profile_image ||
        myProfile?.profileImage ||
        myProfile?.avatar ||
        myProfile?.photo ||
        (typeof window !== "undefined"
          ? localStorage.getItem("userProfilePhoto")
          : null) ||
        null;

      if (resolvedPhoto) {
        setProfilePhoto(resolvedPhoto);
      }

      // 5. Broadcast the updated progress percentage to all global listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-progress-updated", { detail: progress })
        );
      }

      setIsLoading(false);
      return progress;
    } catch (err) {
      console.error("[UserProfileProvider] Error refetching profile:", err);
      setIsLoading(false);
      return 0;
    }
  }, []);

  useEffect(() => {
    refetchProfile();

    // Listen to real-time custom events dispatched anywhere in the app
    function handleProgressUpdate(e: any) {
      if (typeof e.detail === "number") {
        setProfileProgressState(e.detail);
      } else {
        refetchProfile();
      }
    }

    function handleProfileMutation() {
      refetchProfile();
    }

    window.addEventListener("profile-progress-updated", handleProgressUpdate);
    window.addEventListener("profile-updated", handleProfileMutation);

    return () => {
      window.removeEventListener(
        "profile-progress-updated",
        handleProgressUpdate
      );
      window.removeEventListener("profile-updated", handleProfileMutation);
    };
  }, [refetchProfile]);

  return (
    <UserProfileContext.Provider
      value={{
        profileProgress,
        profilePhoto,
        profileData,
        accountType,
        isLoading,
        refetchProfile,
        setProfileProgress,
        updateProfileData,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
