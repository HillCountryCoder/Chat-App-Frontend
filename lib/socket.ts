import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";
import Cookies from "js-cookie";
import { isTokenExpired } from "@/hooks/use-auth-persistence";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().token;

    // Check if token is expired before initializing socket
    if (token && isTokenExpired(token)) {
      console.warn(
        "Token is expired, cannot initialize socket with expired token",
      );

      // Clean up the expired token
      useAuthStore.getState().actions.logout();
      Cookies.remove("token");

      // Create socket without auth token - it will fail to connect but that's expected
      socket = io(SOCKET_URL, {
        autoConnect: false,
        withCredentials: true,
      });
    } else {
      // Token is valid, proceed normally
      socket = io(SOCKET_URL, {
        autoConnect: false,
        withCredentials: true,
        auth: { token },
      });
    }

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);

      // Check if this is an authentication error
      if (
        err.message.includes("Authentication") ||
        err.message.includes("Unauthorized")
      ) {
        // Clear auth state since token is likely invalid
        useAuthStore.getState().actions.logout();
        Cookies.remove("token");

        // Don't retry connecting automatically in case of auth errors
        console.error(
          "Authentication failure in socket connection. User needs to log in again.",
        );
      } else {
        // For other types of errors, retry connection
        setTimeout(() => {
          const currentToken = useAuthStore.getState().token;

          // Only reconnect if we have a valid token
          if (currentToken && !isTokenExpired(currentToken)) {
            // Update auth token before reconnecting
            socket!.auth = { token: currentToken };
            socket?.connect();
          }
        }, 5000);
      }
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const token = useAuthStore.getState().token;

  // Check if token is valid before connecting
  if (!token || isTokenExpired(token)) {
    console.warn("Cannot connect socket: No token or token is expired");

    // Clean up expired token
    if (token && isTokenExpired(token)) {
      useAuthStore.getState().actions.logout();
      Cookies.remove("token");
    }

    // Initialize socket but don't connect
    return initializeSocket();
  }

  // Token is valid, connect normally
  const socket = initializeSocket();

  // Ensure auth has the latest token
  socket.auth = { token };

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
