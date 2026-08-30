"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Smartphone,
  MessageSquare,
  Briefcase,
  UserCheck,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sliders,
  Check,
  Zap,
  Info,
} from "lucide-react";
import {
  useNotificationPreferences,
  NotificationPreferences,
} from "@/hooks/useNotificationPreferences";
import { cn } from "@/lib/utils";

interface NotificationPreferencesPanelProps {
  className?: string;
}

interface CategoryConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  pushKey: keyof NotificationPreferences;
  inAppKey: keyof NotificationPreferences;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "messages",
    title: "Direct Messages",
    description: "Alerts for new direct chats, replies, and mentions in private conversations.",
    icon: MessageSquare,
    iconBg: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600",
    pushKey: "push_messages",
    inAppKey: "in_app_messages",
  },
  {
    id: "jobs",
    title: "Jobs & Opportunities",
    description: "New aviation job openings, company affiliation requests, and recruiter contacts.",
    icon: Briefcase,
    iconBg: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
    pushKey: "push_jobs",
    inAppKey: "in_app_jobs",
  },
  {
    id: "profile_activity",
    title: "Profile & Social Activity",
    description: "When someone views your profile, likes your posts, or leaves comments.",
    icon: UserCheck,
    iconBg: "bg-purple-50 border-purple-100",
    iconColor: "text-purple-600",
    pushKey: "push_profile_activity",
    inAppKey: "in_app_profile_activity",
  },
  {
    id: "frequencies",
    title: "Community Frequencies",
    description: "Invites, discussions, and member updates from your joined aviation groups.",
    icon: Radio,
    iconBg: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
    pushKey: "push_frequencies",
    inAppKey: "in_app_frequencies",
  },
];

// Reusable Toggle Switch Component
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2",
        checked ? "bg-[#1d4ed8]" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function NotificationPreferencesPanel({
  className = "",
}: NotificationPreferencesPanelProps) {
  const {
    preferences,
    isLoading,
    isSaving,
    lastSavedTime,
    error,
    updatePreference,
    toggleAll,
  } = useNotificationPreferences();

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(window.Notification.permission);
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await window.Notification.requestPermission();
        if (permission) {
          setBrowserPermission(permission);
        }
      } catch (e: any) {
        // User dismissed or denied permission prompt (NotAllowedError: Permission dismissed)
        if (window.Notification?.permission) {
          setBrowserPermission(window.Notification.permission);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs sm:text-sm font-medium text-gray-500">
          Loading notification preferences...
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top Header & Save Indicator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">
            Notification Preferences
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Configure how and when you receive alerts across Push and In-App channels.
          </p>
        </div>

        {/* Live Save Badge */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving changes...</span>
            </span>
          ) : lastSavedTime ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Saved</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Browser Push Permission Banner (if not granted) */}
      {browserPermission !== "granted" && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-gray-900">
                Enable Browser Push Notifications
              </p>
              <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                Receive instant alerts even when the Flight Crew Ranked tab is in the background.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestPushPermission}
            className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Allow in Browser
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5 text-xs sm:text-sm font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Master Channel Overview Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
              Global Channel Controls
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAll("all", true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 transition-colors cursor-pointer"
            >
              Enable All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => toggleAll("all", false)}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1 transition-colors cursor-pointer"
            >
              Mute All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Master Push Card */}
          <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900">Push Notifications</p>
                <p className="text-xs text-gray-500">Mobile & device banners</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.push_enabled}
              onChange={(val) => toggleAll("push", val)}
              ariaLabel="Toggle all push notifications"
            />
          </div>

          {/* Master In-App Card */}
          <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900">In-App Notifications</p>
                <p className="text-xs text-gray-500">Bell alerts & feed badges</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.in_app_enabled}
              onChange={(val) => toggleAll("in_app", val)}
              ariaLabel="Toggle all in-app notifications"
            />
          </div>
        </div>
      </div>

      {/* Category Toggles List (Scenario 1 & Scenario 2) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100/90 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
            Category Preferences
          </h3>
          <div className="hidden sm:flex items-center gap-10 pr-2 text-xs font-bold text-gray-400">
            <span>Push</span>
            <span>In-App</span>
          </div>
        </div>

        <div className="divide-y divide-gray-50 space-y-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isPushActive = preferences[cat.pushKey] && preferences.push_enabled;
            const isInAppActive = preferences[cat.inAppKey] && preferences.in_app_enabled;

            return (
              <div
                key={cat.id}
                className="pt-4 pb-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Category Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs mt-0.5",
                      cat.iconBg,
                      cat.iconColor
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm sm:text-base font-extrabold text-gray-900">
                      {cat.title}
                    </span>
                    <p className="text-xs text-gray-500 leading-relaxed mt-0.5 max-w-md">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Independent Delivery Channel Toggles */}
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 pt-2 sm:pt-0 pl-14 sm:pl-0 border-t sm:border-t-0 border-gray-50">
                  {/* Push Toggle */}
                  <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:items-center">
                    <span className="text-xs font-semibold text-gray-500 sm:hidden">Push:</span>
                    <ToggleSwitch
                      checked={Boolean(preferences[cat.pushKey])}
                      onChange={(val) => updatePreference(cat.pushKey, val)}
                      ariaLabel={`${cat.title} Push Notifications`}
                    />
                  </div>

                  {/* In-App Toggle */}
                  <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:items-center">
                    <span className="text-xs font-semibold text-gray-500 sm:hidden">In-App:</span>
                    <ToggleSwitch
                      checked={Boolean(preferences[cat.inAppKey])}
                      onChange={(val) => updatePreference(cat.inAppKey, val)}
                      ariaLabel={`${cat.title} In-App Notifications`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help / Security Note */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          Critical account security and system notices will always be delivered regardless of custom category preferences.
        </p>
      </div>
    </div>
  );
}
