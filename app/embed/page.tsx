"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, AlertCircle } from "lucide-react";
import ChatDashboard from "@/components/chat/ChatDashboard";
import { Button } from "@/components/ui/button";
import { connectSocket, getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

export default function EmbedPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, actions } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const ssoToken = searchParams.get("ssoToken");
    const ssoSignature = searchParams.get("ssoSignature");

    // Websocket-first authentication
    if (ssoToken && ssoSignature) {
      console.log("[Embed] Auhtnenticating via websockets with SSO token");
      authenticateViaSocket(ssoToken, ssoSignature);
    } else if (isAuthenticated) {
      console.log("[Embed] Already authenticated");
      setIsInitializing(false);
    } else {
      console.error("[Embed] No authentication method available");
      setError("No authentication method available.");
      setIsInitializing(false);
    }
    // CLEANUP
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, []);

  const authenticateViaSocket = async (token: string, signature: string) => {
    try {
      console.log("🔧 [DEBUG] Starting socket authentication...");

      const existingSocket = getSocket();
      if (existingSocket) {
        console.log("🔧 [DEBUG] Cleaning up existing socket");
        existingSocket.removeAllListeners();
        existingSocket.disconnect();
      }

      console.log("🔧 [DEBUG] Creating new socket with SSO credentials");

      // Create socket
      const newSocket = connectSocket({
        ssoToken: token,
        ssoSignature: signature,
      });

      console.log("🔧 [DEBUG] Socket created, attaching listeners...");

      // Set up timeout
      const authTimeout = setTimeout(() => {
        console.log("❌ [DEBUG] Auth timeout fired");
        setError("Authentication timeout");
        setIsInitializing(false);
        newSocket.disconnect(); // Clean up on timeout
      }, 10000);

      // Success handler
      const handleAuthSuccess = (data: any) => {
        clearTimeout(authTimeout);
        console.log("✅ [DEBUG] AUTHENTICATED EVENT RECEIVED!", data);

        if (data.success && data.user) {
          const tenant = {
            tenantId: data.user.tenantId || "",
            name: "",
            domain: "",
            allowedOrigins: [],
            status: "verified" as const,
          };

          actions.login(
            {
              _id: data.user._id,
              email: data.user.email,
              username: data.user.username,
              displayName: data.user.displayName,
              avatarUrl: data.user.avatarUrl,
              status: data.user.status,
              tenantId: data.user.tenantId || "",
            },
            data.accessToken,
            data.refreshToken,
            "15m",
            false,
            tenant
          );

          setIsInitializing(false);
          setError(null);

          window.parent.postMessage(
            {
              source: "chat-app",
              type: "CHAT_READY",
              payload: {
                userId: data.user._id,
                email: data.user.email,
              },
              timestamp: Date.now(),
            },
            "*"
          );
        }
      };

      // Attach listeners
      newSocket.once("authenticated", handleAuthSuccess);

      newSocket.once("connect_error", (err: Error) => {
        clearTimeout(authTimeout);
        console.error("❌ [DEBUG] CONNECT_ERROR EVENT RECEIVED!", err);
        setError(err.message || "Authentication failed");
        setIsInitializing(false);

        window.parent.postMessage(
          {
            source: "chat-app",
            type: "CHAT_ERROR",
            payload: { error: err.message },
            timestamp: Date.now(),
          },
          "*"
        );
      });

      console.log("🔧 [DEBUG] Listeners attached, NOW connecting socket...");
      newSocket.connect();
      console.log("🔧 [DEBUG] Socket connect() called, waiting for events...");
    } catch (err) {
      console.error("❌ [DEBUG] Exception in authenticateViaSocket:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
      setIsInitializing(false);
    }
  };
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div>
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  return <ChatDashboard />;
}
