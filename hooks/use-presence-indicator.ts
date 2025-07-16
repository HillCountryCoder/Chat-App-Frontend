// hooks/use-presence-indicator.ts
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { PRESENCE_STATUS } from "@/types/presence";
import { useSingleUserPresence, useUserPresence } from "./use-presence";

export interface PresenceIndicatorData {
  status: PRESENCE_STATUS;
  isOnline: boolean;
  displayText: string;
  color: string;
  bgColor: string;
  textColor: string;
  dotClassName: string;
  lastSeenText: string | null;
  showDot: boolean;
  priority: number; // For sorting by importance
}

// Helper function to format presence data (pure function, no hooks)
export function formatPresenceData(
  status: PRESENCE_STATUS,
  isOnline: boolean,
  lastSeen: Date | null,
): PresenceIndicatorData {
  const getStatusData = (currentStatus: PRESENCE_STATUS) => {
    switch (currentStatus) {
      case PRESENCE_STATUS.ONLINE:
        return {
          displayText: "Online",
          color: "rgb(34, 197, 94)", // green-500
          bgColor: "rgb(34, 197, 94)",
          textColor: "rgb(21, 128, 61)", // green-700
          dotClassName: "bg-green-500",
          priority: 1,
        };

      case PRESENCE_STATUS.AWAY:
        return {
          displayText: "Away",
          color: "rgb(251, 191, 36)", // amber-400
          bgColor: "rgb(251, 191, 36)",
          textColor: "rgb(180, 83, 9)", // amber-700
          dotClassName: "bg-amber-400",
          priority: 2,
        };

      case PRESENCE_STATUS.BUSY:
        return {
          displayText: "Busy",
          color: "rgb(239, 68, 68)", // red-500
          bgColor: "rgb(239, 68, 68)",
          textColor: "rgb(185, 28, 28)", // red-700
          dotClassName: "bg-red-500",
          priority: 3,
        };

      case PRESENCE_STATUS.OFFLINE:
      default:
        return {
          displayText: "Offline",
          color: "rgb(107, 114, 128)", // gray-500
          bgColor: "rgb(107, 114, 128)",
          textColor: "rgb(75, 85, 99)", // gray-600
          dotClassName: "bg-gray-500",
          priority: 4,
        };
    }
  };

  const statusData = getStatusData(status);

  // Format last seen text
  let lastSeenText: string | null = null;
  if (status === PRESENCE_STATUS.OFFLINE && lastSeen) {
    try {
      const now = new Date();
      const lastSeenDate = new Date(lastSeen);
      const diffMinutes = Math.floor(
        (now.getTime() - lastSeenDate.getTime()) / (1000 * 60),
      );

      if (diffMinutes < 1) {
        lastSeenText = "Just now";
      } else if (diffMinutes < 60) {
        lastSeenText = `${diffMinutes}m ago`;
      } else if (diffMinutes < 1440) {
        // 24 hours
        const hours = Math.floor(diffMinutes / 60);
        lastSeenText = `${hours}h ago`;
      } else {
        lastSeenText = formatDistanceToNow(lastSeenDate, { addSuffix: true });
      }
    } catch (error) {
      console.warn("Error formatting last seen date:", error);
    }
  } else if (status === PRESENCE_STATUS.ONLINE) {
    lastSeenText = "Active now";
  }

  return {
    status,
    isOnline,
    displayText: statusData.displayText,
    color: statusData.color,
    bgColor: statusData.bgColor,
    textColor: statusData.textColor,
    dotClassName: statusData.dotClassName,
    lastSeenText,
    showDot: true,
    priority: statusData.priority,
  };
}

export function usePresenceIndicator(userId: string): PresenceIndicatorData {
  const { status, isOnline, lastSeen } = useSingleUserPresence(userId);

  return useMemo(() => {
    const result = formatPresenceData(status, isOnline, lastSeen);
    return result;
  }, [status, isOnline, lastSeen]);
}

// Hook for bulk presence indicators (fixed version)
export function useBulkPresenceIndicators(
  userIds: string[],
): Record<string, PresenceIndicatorData> {
  const { presence } = useUserPresence(userIds);

  return useMemo(() => {
    const result: Record<string, PresenceIndicatorData> = {};

    userIds.forEach((userId) => {
      const userPresence = presence[userId];
      if (userPresence) {
        result[userId] = formatPresenceData(
          userPresence.status,
          userPresence.status !== PRESENCE_STATUS.OFFLINE,
          userPresence.lastSeen,
        );
      } else {
        // Default offline state for users without presence data
        result[userId] = formatPresenceData(
          PRESENCE_STATUS.OFFLINE,
          false,
          null,
        );
      }
    });

    return result;
  }, [userIds, presence]);
}

// Utility hook for sorting users by presence status
export function usePresenceSortedUsers<T extends { _id: string }>(
  users: T[],
): T[] {
  const userIds = useMemo(() => users.map((u) => u._id), [users]);
  const indicators = useBulkPresenceIndicators(userIds);

  return useMemo(() => {
    return [...users].sort((a, b) => {
      const aIndicator = indicators[a._id];
      const bIndicator = indicators[b._id];

      // Sort by priority (online first, then away, busy, offline)
      return aIndicator.priority - bIndicator.priority;
    });
  }, [users, indicators]);
}
