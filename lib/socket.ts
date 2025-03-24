import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().token;
    socket = io(SOCKET_URL, {
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

export const connectSocket = (): Socket => {
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
