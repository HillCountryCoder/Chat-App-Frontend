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

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
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

    function onDisconnect() {
      setIsConnected(false);
      console.log("Socket disconnected");
    }

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
    };
  }, [isAuthenticated]);
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
