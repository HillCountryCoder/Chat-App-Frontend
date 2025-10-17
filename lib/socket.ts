import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      // Don't auto-retry on auth errors - let the app handle token refresh
      if (!err.message.includes("Authentication")) {
        setTimeout(() => {
          socket?.connect();
        }, 5000);
      }
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const token = useAuthStore.getState().token;
  const socket = initializeSocket();
  const tenantId = useAuthStore.getState().tenantId;
  // Always update auth with latest token before connecting
  if (token) {
    socket.auth = { token, tenantId };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
};

export const reconnectSocket = (): void => {
  const token = useAuthStore.getState().token;
  if (socket && token) {
    // Disconnect first
    if (socket.connected) {
      socket.disconnect();
    }
    // Update auth and reconnect
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};
