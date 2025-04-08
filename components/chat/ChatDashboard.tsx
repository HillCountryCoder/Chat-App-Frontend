"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Hash } from "lucide-react";
import CreateChannelDialog from "./CreateChannelDialog";
import ConversationList from "./ConversationList";

export default function ChatDashboard() {
  const router = useRouter();
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Show dropdown menu with options for new direct message or new channel
  const [showNewMenu, setShowNewMenu] = useState(false);

  const handleNewChat = () => {
    router.push("/chat/new");
  };

  const handleCreateChannel = () => {
    setShowCreateChannel(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Messages</h1>
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
