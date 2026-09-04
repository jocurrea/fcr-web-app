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
  isLoading: boolean;
  refetchProfile: () => Promise<number>;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profileProgress: 0,
  profilePhoto: null,
  profileData: null,
  isLoading: true,
  refetchProfile: async () => 0,
});

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profileProgress, setProfileProgress] = useState<number>(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

      // 2. Compute canonical profile completion percentage
      const progress = await fetchProfileProgress(session.user.id);
      setProfileProgress(progress);

      // 3. Resolve profile avatar photo
      const resolvedPhoto =
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

      // 4. Broadcast the updated progress percentage to all global listeners
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
        setProfileProgress(e.detail);
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
        isLoading,
        refetchProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
