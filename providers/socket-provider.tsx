"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
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

  // Function to reconnect socket with fresh token
  const reconnect = () => {
    if (isAuthenticated) {
      const currentToken = useAuthStore.getState().token;

      // Only attempt reconnection if token is valid
      if (currentToken && !isTokenExpired(currentToken)) {
        if (getSocket()) {
          disconnectSocket();
        }

        const socketInstance = connectSocket();
        setSocket(socketInstance);

        // No need to re-add event listeners as they'll be set in the main effect
      }
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

      // Check for authentication errors
      if (
        err.message.includes("Authentication") ||
        err.message.includes("Unauthorized") ||
        err.message.includes("auth") ||
        err.message.includes("token")
      ) {
        console.error(
          "Authentication error in socket connection. Logging out user.",
        );
        actions.logout();
        Cookies.remove("token");
        router.push("/login");
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
    socketInstance.on("attachment_processing_complete", onAttachmentProcessingComplete);

    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onConnectError);
      socketInstance.off("attachment_status_update", onAttachmentStatusUpdate);
      socketInstance.off("attachment_processing_complete", onAttachmentProcessingComplete);
    };
  }, [isAuthenticated, token, actions, router]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}