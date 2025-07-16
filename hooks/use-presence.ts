// hooks/use-presence.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { usePresence } from "@/providers/presence-provider";
import { presenceApi } from "@/lib/presence-api";
import { PRESENCE_STATUS, PresenceStatus } from "@/types/presence";
import { useAuthStore } from "@/store/auth-store";

// Hook for getting presence status of specific users
export function useUserPresence(userIds: string[]) {
  const { getUserPresence } = usePresence();
  const queryClient = useQueryClient();
  // Fetch presence via API as fallback
  const { data: apiPresence, isLoading } = useQuery({
    queryKey: ["presence", "bulk", userIds.sort()],
    queryFn: () => presenceApi.getBulkPresence(userIds),
    enabled: userIds.length > 0,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Get real-time presence from context
  const realtimePresence = useMemo(() => {
    const presence: Record<string, PresenceStatus> = {};
    userIds.forEach((userId) => {
      const userPresence = getUserPresence(userId);
      if (userPresence) {
        presence[userId] = userPresence;
      }
    });
    return presence;
  }, [userIds, getUserPresence]);

  // Merge real-time and API data, preferring real-time
  const mergedPresence = useMemo(() => {
    return { ...apiPresence, ...realtimePresence };
  }, [apiPresence, realtimePresence]);

  const getUserStatus = useCallback(
    (userId: string): PRESENCE_STATUS => {
      return mergedPresence[userId]?.status || PRESENCE_STATUS.OFFLINE;
    },
    [mergedPresence],
  );

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      const status = getUserStatus(userId);
      return status !== PRESENCE_STATUS.OFFLINE;
    },
    [getUserStatus],
  );

  const getLastSeen = useCallback(
    (userId: string): Date | null => {
      return mergedPresence[userId]?.lastSeen || null;
    },
    [mergedPresence],
  );

  return {
    presence: mergedPresence,
    isLoading,
    getUserStatus,
    isUserOnline,
    getLastSeen,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["presence", "bulk"] }),
  };
}

// Hook for a single user's presence
export function useSingleUserPresence(userId: string) {
  const result = useUserPresence([userId]);
  return {
    presence: result.presence[userId] || null,
    status: result.getUserStatus(userId),
    isOnline: result.isUserOnline(userId),
    lastSeen: result.getLastSeen(userId),
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

// Hook for managing current user's status
export function useMyPresence() {
  const { currentStatus, changeStatus, isConnected, isAuthenticated } =
    usePresence();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Get current user's presence from API
  const { data: myPresence, isLoading } = useQuery({
    queryKey: ["presence", "me"],
    queryFn: presenceApi.getMyPresence,
    enabled: !!user,
    staleTime: 30000,
  });

  // Mutation for changing status
  const changeStatusMutation = useMutation({
    mutationFn: (status: PRESENCE_STATUS) => changeStatus(status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presence", "me"] });
    },
  });

  return {
    currentStatus:
      currentStatus || myPresence?.status || PRESENCE_STATUS.OFFLINE,
    isConnected,
    isAuthenticated,
    isLoading,
    changeStatus: changeStatusMutation.mutate,
    isChangingStatus: changeStatusMutation.isPending,
  };
}

// Hook for online users list
export function useOnlineUsers(limit = 20) {
  const { getOnlineUsers, onlineUsers, socket, isAuthenticated } =
    usePresence();

  // Force socket call on mount
  useEffect(() => {
    if (socket && isAuthenticated) {
      getOnlineUsers(limit);
    }
  }, [socket, isAuthenticated, limit]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = () => {
      getOnlineUsers(limit);
    };

    const handleUserOffline = () => {
      getOnlineUsers(limit);
    };

    const handleStatusChanged = () => {
      getOnlineUsers(limit);
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("status_changed", handleStatusChanged);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("status_changed", handleStatusChanged);
    };
  }, [socket, limit, getOnlineUsers]);
  const queryClient = useQueryClient();

  const { data: apiOnlineUsers, isLoading } = useQuery({
    queryKey: ["presence", "online-users", limit],
    queryFn: () => presenceApi.getOnlineUsers({ limit }),
    staleTime: 30000,
    refetchInterval: 60000,
  });
  // Merge real-time and API data
  const mergedUsers = useMemo(() => {
    if (onlineUsers.length > 0) {
      return onlineUsers;
    }
    return apiOnlineUsers?.users || [];
  }, [onlineUsers, apiOnlineUsers]);

  return {
    users: mergedUsers,
    isLoading,
    refetch: () => {
      getOnlineUsers(limit);
      queryClient.invalidateQueries({ queryKey: ["presence", "online-users"] });
    },
  };
}

// Hook for presence analytics
export function usePresenceAnalytics(dateRange?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["presence", "analytics", dateRange],
    queryFn: () => presenceApi.getPresenceAnalytics(dateRange),
    staleTime: 300000, // 5 minutes
  });
}

// Hook for presence history
export function usePresenceHistory(params?: {
  limit?: number;
  skip?: number;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["presence", "history", params],
    queryFn: () => presenceApi.getPresenceHistory(params),
    staleTime: 60000, // 1 minute
  });
}

// Hook for connection presence (for DMs and channels)
export function useConnectionPresence(
  connectionIds: string[],
  type?: "direct_message" | "channel_member",
) {
  const { getBulkPresence, getUserPresence } = usePresence();

  // Get real-time presence
  const realtimePresence = useMemo(() => {
    const presence: Record<string, PresenceStatus> = {};
    connectionIds.forEach((userId) => {
      const userPresence = getUserPresence(userId);
      if (userPresence) {
        presence[userId] = userPresence;
      }
    });
    return presence;
  }, [connectionIds, getUserPresence]);

  // Fetch via API as fallback
  const { data: apiPresence, isLoading } = useQuery({
    queryKey: ["presence", "connections", connectionIds.sort(), type],
    queryFn: () => presenceApi.getBulkPresence(connectionIds),
    enabled: connectionIds.length > 0,
    staleTime: 30000,
  });

  // Trigger real-time fetch
  useEffect(() => {
    if (connectionIds.length > 0) {
      getBulkPresence(connectionIds);
    }
  }, [connectionIds, getBulkPresence]);

  // Merge data
  const mergedPresence = useMemo(() => {
    return { ...apiPresence, ...realtimePresence };
  }, [apiPresence, realtimePresence]);

  const getOnlineCount = useCallback(() => {
    return Object.values(mergedPresence).filter(
      (presence) => presence.status !== PRESENCE_STATUS.OFFLINE,
    ).length;
  }, [mergedPresence]);

  const getStatusBreakdown = useCallback(() => {
    const breakdown = {
      [PRESENCE_STATUS.ONLINE]: 0,
      [PRESENCE_STATUS.AWAY]: 0,
      [PRESENCE_STATUS.BUSY]: 0,
      [PRESENCE_STATUS.OFFLINE]: 0,
    };

    Object.values(mergedPresence).forEach((presence) => {
      breakdown[presence.status]++;
    });

    return breakdown;
  }, [mergedPresence]);

  return {
    presence: mergedPresence,
    isLoading,
    getOnlineCount,
    getStatusBreakdown,
  };
}
