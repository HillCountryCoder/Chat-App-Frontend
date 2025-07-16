"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { useSocket } from "./socket-provider";
import { useAuthStore } from "@/store/auth-store";
import {
  PRESENCE_STATUS,
  PresenceStatus,
  PresenceUpdate,
} from "@/types/presence";
import { presenceApi } from "@/lib/presence-api";
import { toast } from "sonner";
import { Socket } from "socket.io-client";

interface PresenceState {
  socket: Socket | null;
  currentStatus: PRESENCE_STATUS;
  isConnected: boolean;
  lastHeartbeat: Date | null;
  userPresence: Record<string, PresenceStatus>;
  onlineUsers: PresenceStatus[];
  isAuthenticated: boolean;
  connectionError: string | null;
}

type PresenceAction =
  | { type: "SET_STATUS"; status: PRESENCE_STATUS }
  | { type: "SET_CONNECTED"; connected: boolean }
  | { type: "SET_LAST_HEARTBEAT"; timestamp: Date }
  | { type: "UPDATE_USER_PRESENCE"; userId: string; presence: PresenceStatus }
  | { type: "REMOVE_USER_PRESENCE"; userId: string }
  | { type: "SET_ONLINE_USERS"; users: PresenceStatus[] }
  | { type: "SET_AUTHENTICATED"; authenticated: boolean }
  | { type: "SET_CONNECTION_ERROR"; error: string | null }
  | {
      type: "BULK_UPDATE_PRESENCE";
      presenceMap: Record<string, PresenceStatus>;
    };

const initialState: PresenceState = {
  socket: null,
  currentStatus: PRESENCE_STATUS.OFFLINE,
  isConnected: false,
  lastHeartbeat: null,
  userPresence: {},
  onlineUsers: [],
  isAuthenticated: false,
  connectionError: null,
};

function presenceReducer(
  state: PresenceState,
  action: PresenceAction,
): PresenceState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, currentStatus: action.status };

    case "SET_CONNECTED":
      return { ...state, isConnected: action.connected };

    case "SET_LAST_HEARTBEAT":
      return { ...state, lastHeartbeat: action.timestamp };

    case "UPDATE_USER_PRESENCE":
      return {
        ...state,
        userPresence: {
          ...state.userPresence,
          [action.userId]: action.presence,
        },
      };

    case "REMOVE_USER_PRESENCE":
      const { [action.userId]: removed, ...remainingPresence } =
        state.userPresence;
      return { ...state, userPresence: remainingPresence };

    case "SET_ONLINE_USERS":
      return { ...state, onlineUsers: action.users };

    case "SET_AUTHENTICATED":
      return { ...state, isAuthenticated: action.authenticated };

    case "SET_CONNECTION_ERROR":
      return { ...state, connectionError: action.error };

    case "BULK_UPDATE_PRESENCE":
      return {
        ...state,
        userPresence: { ...state.userPresence, ...action.presenceMap },
      };

    default:
      return state;
  }
}

interface PresenceContextType {
  // State
  socket: Socket | null;
  currentStatus: PRESENCE_STATUS;
  isConnected: boolean;
  lastHeartbeat: Date | null;
  userPresence: Record<string, PresenceStatus>;
  onlineUsers: PresenceStatus[];
  isAuthenticated: boolean;
  connectionError: string | null;

  // Actions
  changeStatus: (status: PRESENCE_STATUS) => Promise<void>;
  getUserPresence: (userId: string) => PresenceStatus | null;
  getBulkPresence: (userIds: string[]) => Promise<void>;
  getOnlineUsers: (limit?: number) => Promise<void>;
  authenticatePresence: () => Promise<void>;
  sendHeartbeat: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(presenceReducer, initialState);
  const { socket, isConnected: socketConnected } = useSocket();
  const { user, isAuthenticated } = useAuthStore();

  // Update connection status based on socket
  useEffect(() => {
    dispatch({ type: "SET_CONNECTED", connected: socketConnected });
    if (!socketConnected) {
      dispatch({ type: "SET_AUTHENTICATED", authenticated: false });
      dispatch({ type: "SET_CONNECTION_ERROR", error: null });
    }
  }, [socketConnected]);

  // Authenticate presence when socket connects and user is authenticated
  const authenticatePresence = useCallback(async () => {
    if (!socket || !user || !socketConnected) return;

    try {
      dispatch({ type: "SET_CONNECTION_ERROR", error: null });

      socket.emit(
        "authenticate_presence",
        {
          status:
            state.currentStatus !== PRESENCE_STATUS.OFFLINE
              ? state.currentStatus
              : PRESENCE_STATUS.ONLINE,
        },
        (response: any) => {
          if (response.success) {
            dispatch({ type: "SET_AUTHENTICATED", authenticated: true });

            if (state.currentStatus === PRESENCE_STATUS.OFFLINE) {
              dispatch({ type: "SET_STATUS", status: PRESENCE_STATUS.ONLINE });
            }
          } else {
            dispatch({
              type: "SET_CONNECTION_ERROR",
              error: response.error || "Authentication failed",
            });
            console.error("❌ Presence authentication failed:", response.error);
          }
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "SET_CONNECTION_ERROR", error: errorMessage });
      console.error("❌ Presence authentication error:", error);
    }
  }, [socket, user, socketConnected]);

  // Auto-authenticate when conditions are met
  useEffect(() => {
    if (socketConnected && user && isAuthenticated && !state.isAuthenticated) {
      authenticatePresence();
    }
  }, [
    socketConnected,
    user,
    isAuthenticated,
    state.isAuthenticated,
    authenticatePresence,
  ]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!socket || !state.isAuthenticated) return;

    socket.emit(
      "heartbeat",
      { status: state.currentStatus },
      (response: any) => {
        if (response.success) {
          dispatch({ type: "SET_LAST_HEARTBEAT", timestamp: new Date() });
        } else {
          console.error("Heartbeat failed:", response.error);
        }
      },
    );
  }, [socket, state.isAuthenticated, state.currentStatus]);

  // Change user status
  const changeStatus = useCallback(
    async (status: PRESENCE_STATUS) => {
      if (!socket || !state.isAuthenticated) {
        // Fallback to API if socket not available
        try {
          await presenceApi.updateMyStatus(status);
          dispatch({ type: "SET_STATUS", status });
          toast.success(`Status changed to ${status}`);
        } catch (error) {
          console.error("Failed to update status via API:", error);
          toast.error("Failed to update status");
        }
        return;
      }

      socket.emit("change_status", { status }, (response: any) => {
        if (response.success) {
          dispatch({ type: "SET_STATUS", status });
          toast.success(`Status changed to ${status}`);
        } else {
          console.error("Failed to change status:", response.error);
          toast.error("Failed to change status");
        }
      });
    },
    [socket, state.isAuthenticated],
  );

  // Get user presence
  const getUserPresence = useCallback(
    (userId: string): PresenceStatus | null => {
      return state.userPresence[userId] || null;
    },
    [state.userPresence],
  );

  // Get bulk presence
  const getBulkPresence = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) return;

      if (!socket || !state.isAuthenticated) {
        // Fallback to API
        try {
          const presenceMap = await presenceApi.getBulkPresence(userIds);
          dispatch({ type: "BULK_UPDATE_PRESENCE", presenceMap });
        } catch (error) {
          console.error("Failed to get bulk presence via API:", error);
        }
        return;
      }

      socket.emit("get_presence", { userIds }, (response: any) => {
        if (response.success && response.presence) {
          dispatch({
            type: "BULK_UPDATE_PRESENCE",
            presenceMap: response.presence,
          });
        } else {
          console.error("Failed to get bulk presence:", response.error);
        }
      });
    },
    [socket, state.isAuthenticated],
  );

  // Get online users
  const getOnlineUsers = useCallback(
    async (limit = 20) => {
      if (!socket || !state.isAuthenticated) {
        // Fallback to API
        try {
          const { users } = await presenceApi.getOnlineUsers({ limit });
          dispatch({ type: "SET_ONLINE_USERS", users });
        } catch (error) {
          console.error("Failed to get online users via API:", error);
        }
        return;
      }

      socket.emit("get_online_users", { limit }, (response: any) => {
        if (response.success && response.users) {
          dispatch({ type: "SET_ONLINE_USERS", users: response.users });
        } else {
          console.error("Failed to get online users:", response.error);
        }
      });
    },
    [socket, state.isAuthenticated],
  );

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (data: PresenceUpdate) => {
      if (data.userStatus) {
        const presence: PresenceStatus = {
          userId: data.userId,
          status: data.userStatus,
          lastSeen: new Date(data.timestamp),
        };
        dispatch({
          type: "UPDATE_USER_PRESENCE",
          userId: data.userId,
          presence,
        });
      }
    };

    const handleUserOnline = (data: {
      userId: string;
      status: PRESENCE_STATUS;
      timestamp: Date;
    }) => {
      const presence: PresenceStatus = {
        userId: data.userId,
        status: data.status,
        lastSeen: new Date(data.timestamp),
      };
      dispatch({ type: "UPDATE_USER_PRESENCE", userId: data.userId, presence });
    };

    const handleUserOffline = (data: { userId: string; timestamp: Date }) => {
      const presence: PresenceStatus = {
        userId: data.userId,
        status: PRESENCE_STATUS.OFFLINE,
        lastSeen: new Date(data.timestamp),
      };
      dispatch({ type: "UPDATE_USER_PRESENCE", userId: data.userId, presence });
    };

    const handleStatusChanged = (data: {
      userId: string;
      oldStatus: PRESENCE_STATUS;
      newStatus: PRESENCE_STATUS;
      timestamp: Date;
    }) => {
      const presence: PresenceStatus = {
        userId: data.userId,
        status: data.newStatus,
        lastSeen: new Date(data.timestamp),
      };
      dispatch({ type: "UPDATE_USER_PRESENCE", userId: data.userId, presence });
    };

    // Register listeners
    socket.on("presence_update", handlePresenceUpdate);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("status_changed", handleStatusChanged);

    return () => {
      socket.off("presence_update", handlePresenceUpdate);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("status_changed", handleStatusChanged);
    };
  }, [socket]);

  // Heartbeat interval
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(sendHeartbeat, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [state.isAuthenticated, sendHeartbeat]);

  const contextValue: PresenceContextType = {
    // State
    socket: socket,
    currentStatus: state.currentStatus,
    isConnected: state.isConnected,
    lastHeartbeat: state.lastHeartbeat,
    userPresence: state.userPresence,
    onlineUsers: state.onlineUsers,
    isAuthenticated: state.isAuthenticated,
    connectionError: state.connectionError,

    // Actions
    changeStatus,
    getUserPresence,
    getBulkPresence,
    getOnlineUsers,
    authenticatePresence,
    sendHeartbeat,
  };

  return (
    <PresenceContext.Provider value={contextValue}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return context;
}
