import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

let socket: Socket | null = null;

interface ConnectionOptions {
  ssoToken?: string;
  ssoSignature?: string;
}

export const initializeSocket = (options?: ConnectionOptions): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const authConfig: any = {};
  if (options?.ssoToken && options?.ssoSignature) {
    authConfig.ssoToken = options.ssoToken;
    authConfig.ssoSignature = options.ssoSignature;
  } else {
    // JWT token authentciation (fallback)
    const token = useAuthStore.getState().token;
    const tenantId = useAuthStore.getState().tenantId;
    if (token) {
      authConfig.token = token;
      authConfig.tenantId = tenantId;
    }
  }
  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth: authConfig,
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
  return socket;
};

export const connectSocket = (options?: ConnectionOptions): Socket => {
  const socket = initializeSocket(options);
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const reconnectSocket = (): void => {
  const token = useAuthStore.getState().token;
  if (socket && token) {
    if (socket.connected) {
      socket.disconnect();
    }
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
