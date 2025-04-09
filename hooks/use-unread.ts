// hooks/use-unread.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { useEffect, useState } from "react";

// Types for unread counts
export interface UnreadCounts {
  directMessages: Record<string, number>;
  channels: Record<string, number>;
}

export function useUnreadCounts() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [localUnreadCounts, setLocalUnreadCounts] = useState<UnreadCounts>({
    directMessages: {},
    channels: {},
  });

  // Fetch initial unread counts
  const { data, isLoading, error } = useQuery({
    queryKey: ["unread-counts"],
    queryFn: async () => {
      const { data } = await api.get("/direct-messages/unread");
      return data as UnreadCounts;
    },
  });

  // Set up socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUnreadCountsUpdate = (updatedCounts: UnreadCounts) => {
      // Update the query cache
      queryClient.setQueryData(["unread-counts"], updatedCounts);
      // Also update local state for components that might not be connected to the query
      setLocalUnreadCounts(updatedCounts);
    };

    socket.on("unread_counts_update", handleUnreadCountsUpdate);

    return () => {
      socket.off("unread_counts_update", handleUnreadCountsUpdate);
    };
  }, [socket, queryClient]);

  // Get the unread count for a specific direct message
  const getDirectMessageUnreadCount = (directMessageId: string): number => {
    if (data?.directMessages?.[directMessageId]) {
      return data.directMessages[directMessageId];
    }
    if (localUnreadCounts.directMessages?.[directMessageId]) {
      return localUnreadCounts.directMessages[directMessageId];
    }
    return 0;
  };

  // Get the unread count for a specific channel
  const getChannelUnreadCount = (channelId: string): number => {
    if (data?.channels?.[channelId]) {
      return data.channels[channelId];
    }
    if (localUnreadCounts.channels?.[channelId]) {
      return localUnreadCounts.channels[channelId];
    }
    return 0;
  };

  // Get total unread count
  const getTotalUnreadCount = (): number => {
    let total = 0;

    // Count direct messages
    if (data?.directMessages) {
      total += Object.values(data.directMessages).reduce(
        (sum, count) => sum + count,
        0,
      );
    } else if (localUnreadCounts.directMessages) {
      total += Object.values(localUnreadCounts.directMessages).reduce(
        (sum, count) => sum + count,
        0,
      );
    }

    // Count channels
    if (data?.channels) {
      total += Object.values(data.channels).reduce(
        (sum, count) => sum + count,
        0,
      );
    } else if (localUnreadCounts.channels) {
      total += Object.values(localUnreadCounts.channels).reduce(
        (sum, count) => sum + count,
        0,
      );
    }

    return total;
  };

  return {
    unreadCounts: data || localUnreadCounts,
    isLoading,
    error,
    getDirectMessageUnreadCount,
    getChannelUnreadCount,
    getTotalUnreadCount,
  };
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Mark direct message as read
  const markDirectMessageAsRead = useMutation({
    mutationFn: async (directMessageId: string) => {
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          socket.emit(
            "mark_dm_read",
            { directMessageId },
            (response: { success: boolean; error?: string }) => {
              if (response.success) {
                resolve(response);
              } else {
                reject(new Error(response.error || "Failed to mark as read"));
              }
            },
          );
        });
      } else {
        // Fallback to REST API
        const { data } = await api.post(
          `/direct-messages/${directMessageId}/read`,
        );
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate the unread counts query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });

  // Mark channel as read
  const markChannelAsRead = useMutation({
    mutationFn: async (channelId: string) => {
      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          socket.emit(
            "mark_channel_read",
            { channelId },
            (response: { success: boolean; error?: string }) => {
              if (response.success) {
                resolve(response);
              } else {
                reject(new Error(response.error || "Failed to mark as read"));
              }
            },
          );
        });
      } else {
        // Fallback to REST API
        const { data } = await api.post(`/channels/${channelId}/read`);
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate the unread counts query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });

  return {
    markDirectMessageAsRead,
    markChannelAsRead,
  };
}
