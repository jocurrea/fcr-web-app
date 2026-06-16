"use client";

import { useEffect } from "react";

export function StorageProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__storageIntercepted) {
      (window as any).__storageIntercepted = true;
      
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;

      const SCOPED_KEYS = [
        "onboarding_personal", "onboarding_licenses", "onboarding_ratings", 
        "onboarding_work", "onboarding_resume", "userProfilePhoto", 
        "user_posts", "userName"
      ];

      Storage.prototype.getItem = function(key) {
        if (SCOPED_KEYS.includes(key as string)) {
          const userId = originalGetItem.call(this, "current_user_id");
          if (userId) return originalGetItem.call(this, `${key}_${userId}`);
        }
        return originalGetItem.call(this, key as string);
      };

      Storage.prototype.setItem = function(key, value) {
        if (SCOPED_KEYS.includes(key as string)) {
          const userId = originalGetItem.call(this, "current_user_id");
          if (userId) return originalSetItem.call(this, `${key}_${userId}`, value);
        }
        return originalSetItem.call(this, key as string, value);
      };

      Storage.prototype.removeItem = function(key) {
        if (SCOPED_KEYS.includes(key as string)) {
          const userId = originalGetItem.call(this, "current_user_id");
          if (userId) return originalRemoveItem.call(this, `${key}_${userId}`);
        }
        return originalRemoveItem.call(this, key as string);
      };
    }
  }, []);

  return null;
}
