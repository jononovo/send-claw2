import { useState, useCallback } from "react";
import { getBadgeByTrigger, BadgeConfig } from "@/features/gamification";

const SHOWN_BADGES_KEY = "5ducks_shown_badges";

interface NotificationState {
  isOpen: boolean;
  badge: BadgeConfig | null;
}

function getShownBadges(): string[] {
  try {
    const stored = localStorage.getItem(SHOWN_BADGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markBadgeAsShown(trigger: string): void {
  try {
    const shown = getShownBadges();
    if (!shown.includes(trigger)) {
      shown.push(trigger);
      localStorage.setItem(SHOWN_BADGES_KEY, JSON.stringify(shown));
    }
  } catch (error) {
    console.error("Failed to save badge state:", error);
  }
}

function hasBadgeBeenShown(trigger: string): boolean {
  return getShownBadges().includes(trigger);
}

export function useNotifications() {
  const [notificationState, setNotificationState] = useState<NotificationState>({
    isOpen: false,
    badge: null
  });

  const triggerNotification = useCallback((trigger: string): boolean => {
    if (hasBadgeBeenShown(trigger)) {
      console.log("Badge already shown for trigger:", trigger);
      return false;
    }

    const badge = getBadgeByTrigger(trigger);
    if (!badge) {
      console.log("No badge found for trigger:", trigger);
      return false;
    }

    setNotificationState({
      isOpen: true,
      badge
    });
    return true;
  }, []);

  const closeNotification = useCallback(() => {
    if (notificationState.badge) {
      markBadgeAsShown(notificationState.badge.trigger);
    }
    
    setNotificationState({
      isOpen: false,
      badge: null
    });
  }, [notificationState.badge]);

  return {
    notificationState,
    triggerNotification,
    closeNotification
  };
}
