import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().token;
    console.log("token", token);
    socket = io(SOCKET_URL, {
      path: process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io",
      autoConnect: false,
      withCredentials: true,
      auth: { token },
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setTimeout(() => {
        socket?.connect();
      }, 5000);
    });
  }
  return socket;
};

export const connectSocket = (): Socket | null => {
  const token = useAuthStore.getState().token;
  if (!token) {
    console.warn("cannot connect socket: No Authentication token available");
    return null;
  }
  const socket = initializeSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};
