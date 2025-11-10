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
      return;
    }

    // Fallback: check if already authenticated
    if (isAuthenticated) {
      console.log("[Embed] Already authenticated");
      setIsInitializing(false);
      return;
    }

    // No auth method available
    console.error("[Embed] No authentication method available");
    setError("No authentication method available.");
    setIsInitializing(false);
  }, [isAuthenticated]);

  const authenticateViaSocket = async (token: string, signature: string) => {
    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.disconnect();
      }

      // create news socket with SSO credentials
      const newSocket = connectSocket({
        ssoToken: token,
        ssoSignature: signature,
      });

      // wait for authentication event
      const authTimeout = setTimeout(() => {
        setError("Authentication timed out");
        setIsInitializing(false);
      }, 10000); // 10 seconds timeout
      newSocket.once("authenticated", (data: any) => {
        clearTimeout(authTimeout);
        console.log("✅ [Embed] Socket authenticated", data);

        if (data.success && data.user) {
          // Store tokens and user in auth store
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

          // Notify parent (optional, for backward compatibility)
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
      });

      newSocket.once("connect_error", (err: Error) => {
        clearTimeout(authTimeout);
        console.error("❌ [Embed] Socket connection error:", err);
        setError(err.message || "Authentication failed");
        setIsInitializing(false);

        // Notify parent of error
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
    } catch (err: any) {
      console.error("[Embed] Authentication error:", err);
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
