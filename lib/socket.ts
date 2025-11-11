import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

let socket: Socket | null = null;

interface ConnectionOptions {
  ssoToken?: string;
  ssoSignature?: string;
}

export const initializeSocket = (options?: ConnectionOptions): Socket => {
  // If SSO auth, always create a fresh socket
  if (options?.ssoToken && options?.ssoSignature) {
    console.log("🔧 [Socket] Creating fresh socket for SSO auth");

    // Disconnect and cleanup old socket
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: {
        ssoToken: options.ssoToken,
        ssoSignature: options.ssoSignature,
      },
    });

    console.log("🔧 [Socket] Fresh socket created for SSO");
    return socket;
  }

  // For JWT auth, reuse existing socket if connected
  if (socket?.connected) {
    console.log("🔧 [Socket] Reusing existing connected socket");
    return socket;
  }

  // Create new JWT socket
  console.log("🔧 [Socket] Creating new JWT socket");
  const token = useAuthStore.getState().token;
  const tenantId = useAuthStore.getState().tenantId;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth: token ? { token, tenantId } : {},
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
    if (!err.message.includes("Authentication")) {
      setTimeout(() => {
        socket?.connect();
      }, 5000);
    }
  });

  return socket;
};

export const connectSocket = (options?: ConnectionOptions): Socket => {
  return initializeSocket(options);
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
