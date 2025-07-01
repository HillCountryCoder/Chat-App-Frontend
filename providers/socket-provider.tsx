"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Socket } from "socket.io-client";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  reconnectSocket,
} from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { isTokenExpired } from "@/hooks/use-auth-persistence";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, token, actions } = useAuthStore();
  const router = useRouter();

  const reconnect = () => {
    if (isAuthenticated && token) {
      reconnectSocket();
    }
  };

  useEffect(() => {
    // Check token validity
    if (token && isTokenExpired(token)) {
      console.warn("Token expired, logging out user");
      actions.logout();
      Cookies.remove("token");
      router.push("/login");
      return;
    }

    if (!isAuthenticated) {
      if (getSocket()?.connected) {
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = connectSocket();
    setSocket(socketInstance);

    function onConnect() {
      setIsConnected(true);
      console.log("Socket connected");
    }

    function onDisconnect(reason: string) {
      setIsConnected(false);
      console.log("Socket disconnected:", reason);
    }

    function onConnectError(err: Error) {
      console.error("Socket connection error:", err.message);

      // Don't logout immediately - let API interceptor handle token refresh
      if (
        err.message.includes("Authentication") ||
        err.message.includes("token")
      ) {
        console.warn("Socket auth error - will retry with fresh token");
        // Just disconnect, don't logout
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
      }
    }

    // Attachment status update handlers
    function onAttachmentStatusUpdate(data: {
      attachmentId: string;
      status: string;
      metadata?: any;
      error?: string;
    }) {
      // This will be handled by individual components using useAttachmentStatusUpdates
    }

    function onAttachmentProcessingComplete(data: {
      attachmentId: string;
      status: string;
      fileName: string;
    }) {
      console.log("Attachment processing complete:", data);
      // This will be handled by individual components using useAttachmentStatusUpdates
    }

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onConnectError);
    socketInstance.on("attachment_status_update", onAttachmentStatusUpdate);
    socketInstance.on(
      "attachment_processing_complete",
      onAttachmentProcessingComplete,
    );

    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onConnectError);
      socketInstance.off("attachment_status_update", onAttachmentStatusUpdate);
      socketInstance.off(
        "attachment_processing_complete",
        onAttachmentProcessingComplete,
      );
    };
  }, [isAuthenticated, token, actions, router]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}
