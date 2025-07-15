import { apiClient } from "./api";
import { 
  PresenceStatus, 
  PRESENCE_STATUS, 
  OnlineUsersResponse, 
  PresenceStats,
  PresenceHistory,
  PresenceAnalytics 
} from "@/types/presence";

export const presenceApi = {
  // Get current user's presence status
  getMyPresence: () => 
    apiClient.get<PresenceStatus>("/presence/me"),

  // Update current user's status
  updateMyStatus: (status: PRESENCE_STATUS) =>
    apiClient.put<{ success: boolean }>("/presence/me/status", { status }),

  // Get presence status of specific users
  getBulkPresence: (userIds: string[]) =>
    apiClient.post<Record<string, PresenceStatus>>("/presence/bulk", { userIds }),

  // Get online users with pagination
  getOnlineUsers: (params?: { limit?: number; cursor?: string }) =>
    apiClient.get<OnlineUsersResponse>("/presence/online", { params }),

  // Get presence status of user's connections
  getConnectionsPresence: (params?: { type?: string; channelId?: string }) =>
    apiClient.get<Record<string, PresenceStatus>>("/presence/connections", { params }),

  // Get user's presence history
  getPresenceHistory: (params?: {
    limit?: number;
    skip?: number;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient.get<{
      history: PresenceHistory[];
      pagination: {
        total: number;
        limit: number;
        skip: number;
        hasMore: boolean;
      };
    }>("/presence/history", { params }),

  // Get presence analytics for current user
  getPresenceAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<PresenceAnalytics>("/presence/analytics", { params }),

  // Connection management
  addConnection: (data: {
    connectionId: string;
    type: "direct_message" | "channel_member";
    channelId?: string;
    directMessageId?: string;
  }) =>
    apiClient.post<{ success: boolean; message: string }>("/presence/connections", data),

  removeConnection: (connectionId: string, params?: {
    type?: string;
    channelId?: string;
    directMessageId?: string;
  }) =>
    apiClient.delete<{ success: boolean; message: string }>(`/presence/connections/${connectionId}`, { params }),

  // Admin endpoints (if user has admin privileges)
  getPresenceStats: () =>
    apiClient.get<PresenceStats>("/presence/admin/stats"),

  cleanupPresenceHistory: (daysToKeep = 90) =>
    apiClient.post<{ success: boolean; deletedCount: number; message: string }>("/presence/admin/cleanup", { daysToKeep }),

  getActiveSessions: () =>
    apiClient.get<{ activeSessions: PresenceHistory[]; count: number }>("/presence/admin/active-sessions"),
};
