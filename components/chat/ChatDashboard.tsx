"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Hash, LogIn } from "lucide-react";
import CreateChannelDialog from "./CreateChannelDialog";
import ConversationList from "./ConversationList";
import { useAuthPersistence } from "@/hooks/use-auth-persistence";
import { useAuthStore } from "@/store/auth-store";

export default function ChatDashboard() {
  const router = useRouter();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Get auth state and iframe detection
  const { isAuthenticated, hasHydrated, isInIframe } = useAuthPersistence();
  const { user } = useAuthStore();

  const handleNewChat = () => {
    router.push("/chat/new");
  };

  const handleCreateChannel = () => {
    setShowCreateChannel(true);
  };

  const handleLogin = () => {
    window.location.href = "/login";
  };

  // Show loading state while hydrating
  if (!hasHydrated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state (especially for iframe)
  if (!isAuthenticated) {
    return (
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
              ? "Please log in to access your messages and conversations."
              : "Please log in to start chatting with your team."}
          </p>

          <Button onClick={handleLogin} className="w-full">
            <LogIn className="mr-2 h-4 w-4" />
            Login to Chat
          </Button>

          {isInIframe && (
            <p className="text-xs text-muted-foreground mt-4">
              Running in iframe mode
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main authenticated dashboard
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            {isInIframe && (
              <p className="text-xs text-muted-foreground">
                Welcome back, {user?.displayName || user?.username}
              </p>
            )}
          </div>

          <div className="relative">
            <Button onClick={() => setShowNewMenu(!showNewMenu)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md bg-popover shadow-lg overflow-hidden border border-border z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleNewChat();
                      setShowNewMenu(false);
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    New Direct Message
                  </button>
                  <button
                    onClick={() => {
                      handleCreateChannel();
                      setShowNewMenu(false);
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                  >
                    <Hash className="mr-2 h-4 w-4" />
                    New Channel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConversationList />
      </div>

      {/* Channel creation dialog */}
      <CreateChannelDialog
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
      />
    </div>
  );
}
