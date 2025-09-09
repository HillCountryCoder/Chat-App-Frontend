"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Hash, LogIn, ExternalLink } from "lucide-react";
import CreateChannelDialog from "./CreateChannelDialog";
import ConversationList from "./ConversationList";
import { useAuthPersistence } from "@/hooks/use-auth-persistence";
import { useAuthStore } from "@/store/auth-store";

// Memoized loading component
const LoadingState = memo(() => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading chat...</p>
    </div>
  </div>
));
LoadingState.displayName = "LoadingState";

// Memoized unauthenticated state component
const UnauthenticatedState = memo(
  ({
    isInIframe,
    onLoginInIframe,
    onOpenInNewTab,
  }: {
    isInIframe: boolean;
    onLoginInIframe: () => void;
    onOpenInNewTab: () => void;
  }) => (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>

        <h2 className="text-xl font-semibold mb-2">
          {isInIframe ? "Chat Authentication Required" : "Welcome to Chat"}
        </h2>

        <p className="text-muted-foreground mb-6">
          {isInIframe
            ? "Your session has expired. Please choose an option to continue."
            : "Please log in to start chatting with your team."}
        </p>

        <div className="flex flex-col gap-3">
          {isInIframe ? (
            <>
              <Button onClick={onOpenInNewTab} className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Chat in New Tab
              </Button>
              <Button
                onClick={onLoginInIframe}
                variant="outline"
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login Here
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Running in embedded mode
              </p>
            </>
          ) : (
            <Button
              onClick={() => (window.location.href = "/login")}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login to Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  ),
);
UnauthenticatedState.displayName = "UnauthenticatedState";

// Memoized authenticated content component
const AuthenticatedContent = memo(
  ({
    showCreateChannel,
    onCreateChannel,
    onCloseCreateChannel,
    onNewChat,
  }: {
    showCreateChannel: boolean;
    onCreateChannel: () => void;
    onCloseCreateChannel: () => void;
    onNewChat: () => void;
  }) => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Messages</h1>
          <div className="flex gap-2">
            <Button onClick={onNewChat} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              New Chat
            </Button>
            <Button onClick={onCreateChannel} size="sm" variant="outline">
              <Hash className="w-4 h-4 mr-1" />
              Channel
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <ConversationList />
      </div>

      {/* Dialogs */}
      <CreateChannelDialog
        isOpen={showCreateChannel}
        onClose={onCloseCreateChannel}
      />
    </div>
  ),
);
AuthenticatedContent.displayName = "AuthenticatedContent";

export default function ChatDashboard() {
  const router = useRouter();
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Get auth state - minimal destructuring to reduce re-renders
  const { isAuthenticated, hasHydrated, isInIframe } = useAuthPersistence();
  const { user, token, refreshToken } = useAuthStore();

  // Memoized handlers to prevent unnecessary re-renders of child components
  const handleNewChat = useCallback(() => {
    router.push("/chat/new");
  }, [router]);

  const handleCreateChannel = useCallback(() => {
    setShowCreateChannel(true);
  }, []);

  const handleCloseCreateChannel = useCallback(() => {
    setShowCreateChannel(false);
  }, []);

  const handleLoginInIframe = useCallback(() => {
    window.location.href = "/login?iframe=true";
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    window.open(window.location.origin, "_blank");
  }, []);

  // Debug logging - only in development and throttled
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const timer = setTimeout(() => {
      console.log("🔍 ChatDashboard Auth Debug:", {
        isAuthenticated,
        hasHydrated,
        isInIframe,
        hasUser: !!user,
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        tokenPreview: token ? token.substring(0, 10) + "..." : null,
      });
    }, 500); // Throttle debug logs

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasHydrated, isInIframe, user, token, refreshToken]);

  // Show loading state while hydrating
  if (!hasHydrated) {
    console.log("🔄 ChatDashboard: Still hydrating...");
    return <LoadingState />;
  }

  // Handle unauthenticated state
  if (!isAuthenticated) {
    console.log("🔄 ChatDashboard: Not authenticated, showing login UI");
    return (
      <UnauthenticatedState
        isInIframe={isInIframe}
        onLoginInIframe={handleLoginInIframe}
        onOpenInNewTab={handleOpenInNewTab}
      />
    );
  }

  // Authenticated state
  console.log(
    "✅ ChatDashboard: Authenticated, showing chat interface",
    hasHydrated && isAuthenticated
      ? user?._id || "loading user..."
      : "not ready",
  );

  return (
    <AuthenticatedContent
      showCreateChannel={showCreateChannel}
      onCreateChannel={handleCreateChannel}
      onCloseCreateChannel={handleCloseCreateChannel}
      onNewChat={handleNewChat}
    />
  );
}
