"use client";

import { useEffect, useState } from "react";
import { useSSOAuth } from "@/hooks/use-sso-auth";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, AlertCircle } from "lucide-react";
import ChatDashboard from "@/components/chat/ChatDashboard";
import { Button } from "@/components/ui/button";

export default function EmbedPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingForAuth, setWaitingForAuth] = useState(true);
  const ssoAuth = useSSOAuth();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log("🎬 Embed page mounted, waiting for INIT_CHAT message");

    const handleMessage = async (event: MessageEvent) => {
      console.log("📨 [Chat Embed] Received message:", event.data);

      if (
        event.data?.type === "INIT_CHAT" &&
        event.data?.source === "wnp-app"
      ) {
        console.log("✅ [Chat Embed] Valid INIT_CHAT message received");
        const { token, signature } = event.data.payload || {};

        if (!token || !signature) {
          console.error("❌ [Chat Embed] Missing token or signature");
          const errorMsg = "Missing authentication data";
          setError(errorMsg);
          setIsInitializing(false);
          setWaitingForAuth(false);

          // Notify parent of error
          window.parent.postMessage(
            {
              source: "chat-app",
              type: "CHAT_ERROR",
              payload: { error: errorMsg },
              timestamp: Date.now(),
            },
            "*",
          );
          return;
        }

        try {
          console.log("🔐 [Chat Embed] Attempting SSO authentication...");

          const result = await ssoAuth.mutateAsync({ token, signature });

          console.log("✅ [Chat Embed] SSO authentication successful:", result);

          // CRITICAL: Update states BEFORE sending message
          setIsInitializing(false);
          setWaitingForAuth(false);
          setError(null);

          // CRITICAL: Send CHAT_READY to parent
          console.log("📤 [Chat Embed] Sending CHAT_READY to parent");
          window.parent.postMessage(
            {
              source: "chat-app",
              type: "CHAT_READY",
              payload: {
                userId: result.user.id,
                email: result.user.email,
              },
              timestamp: Date.now(),
            },
            "*",
          );

          console.log("✅ [Chat Embed] CHAT_READY sent successfully");
        } catch (err) {
          console.error("❌ [Chat Embed] SSO failed:", err);
          const errorMsg =
            err instanceof Error ? err.message : "Authentication failed";

          setError(errorMsg);
          setIsInitializing(false);
          setWaitingForAuth(false);

          // Notify parent of error
          window.parent.postMessage(
            {
              source: "chat-app",
              type: "CHAT_ERROR",
              payload: { error: errorMsg },
              timestamp: Date.now(),
            },
            "*",
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Send ready signal to parent
    console.log("📤 Sending EMBED_READY to parent");
    window.parent.postMessage(
      {
        source: "chat-app",
        type: "EMBED_READY",
        timestamp: Date.now(),
      },
      "*",
    );

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (waitingForAuth) {
        console.warn("⏰ Authentication timeout - no INIT_CHAT received");
        setError("Authentication timeout - please refresh the page");
        setIsInitializing(false);
        setWaitingForAuth(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, [ssoAuth, isAuthenticated]);

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
        <p className="text-muted-foreground">
          {waitingForAuth
            ? "Waiting for authentication..."
            : "Initializing chat..."}
        </p>
      </div>
    );
  }

  return <ChatDashboard />;
}
