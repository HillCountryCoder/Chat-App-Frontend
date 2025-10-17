"use client";

import { useEffect, useState } from "react";
import { useSSOAuth } from "@/hooks/use-sso-auth";
import { useAuthStore } from "@/store/auth-store";
import { Loader2 } from "lucide-react";
import ChatDashboard from "@/components/chat/ChatDashboard";

export default function EmbedPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ssoAuth = useSSOAuth();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (
        event.data?.type === "INIT_CHAT" &&
        event.data?.source !== "chat-app"
      ) {
        const { token, signature } = event.data.payload || {};
        if (!token || !signature) {
          setError("Missing authentication data");
          setIsInitializing(false);
          return;
        }

        try {
          await ssoAuth.mutateAsync({ token, signature });
          setIsInitializing(false);
        } catch (err) {
          console.error("SSO failed:", err);
          setError("Authentication failed");
          setIsInitializing(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ source: "chat-app", type: "EMBED_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, [ssoAuth]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <ChatDashboard />;
}
