/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-unread.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "lodash";

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
      try {
        const { data } = await api.get("/direct-messages/unread-counts");
        return data as UnreadCounts;
      } catch (error) {
        console.error("Error fetching unread counts:", error);
        // Return empty counts on error rather than failing the query
        return { directMessages: {}, channels: {} } as UnreadCounts;
      }
    },
    // Still return empty counts on error
    staleTime: 30000, // 30 seconds
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

  // Create debounced functions to prevent excessive API calls
  const debouncedDirectMessageMarkRead = useCallback(
    debounce(
      async (directMessageId: string, socketInstance: any, callback: any) => {
        try {
          if (socketInstance?.connected) {
            socketInstance.emit("mark_dm_read", { directMessageId }, callback);
          } else {
            const { data } = await api.post(
              `/direct-messages/${directMessageId}/read`,
            );
            callback(data);
          }
        } catch (error) {
          console.error("Error marking messages as read:", error);
          callback({ success: false });
        }
      },
      500,
    ), // 500ms debounce
    [],
  );

  const debouncedChannelMarkRead = useCallback(
    debounce(async (channelId: string, socketInstance: any, callback: any) => {
      try {
        if (socketInstance?.connected) {
          socketInstance.emit("mark_channel_read", { channelId }, callback);
        } else {
          const { data } = await api.post(`/channels/${channelId}/read`);
          callback(data);
        }
      } catch (error) {
        console.error("Error marking channel messages as read:", error);
        callback({ success: false });
      }
    }, 500), // 500ms debounce
    [],
  );

  // Mark direct message as read
  const markDirectMessageAsRead = useMutation({
    mutationFn: async (directMessageId: string) => {
      return new Promise((resolve) => {
        // Make a local copy of the socket to avoid dependency issues
        const currentSocket = socket;
        debouncedDirectMessageMarkRead(
          directMessageId,
          currentSocket,
          (response: any) => {
            resolve(response || { success: true });
          },
        );
      });
    },
    onSuccess: () => {
      // Invalidate the unread counts query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });

  // Mark channel as read
  const markChannelAsRead = useMutation({
    mutationFn: async (channelId: string) => {
      return new Promise((resolve) => {
        // Make a local copy of the socket to avoid dependency issues
        const currentSocket = socket;
        debouncedChannelMarkRead(channelId, currentSocket, (response: any) => {
          resolve(response || { success: true });
        });
      });
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
