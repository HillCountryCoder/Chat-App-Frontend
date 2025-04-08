"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDirectMessages } from "@/hooks/use-chat";
import { useDirectMessageUsers } from "@/hooks/use-direct-message-users";
import { useChannels } from "@/hooks/use-channels";
import {
  PlusCircle,
  Home,
  AtSign,
  Star,
  ChevronDown,
  ChevronRight,
  Hash,
  Volume2,
  Megaphone,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage } from "@/types/chat";
import { ChannelType } from "@/types/chat";
import CreateChannelDialog from "./CreateChannelDialog";

export default function ChatSidebar() {
  const [shortcutsOpen, setShortcutsOpen] = useState(true);
  const [directMessagesOpen, setDirectMessagesOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const { data: directMessages, isLoading: loadingDMs } = useDirectMessages();
  const { getOtherParticipant, isLoading: loadingUsers } =
    useDirectMessageUsers(directMessages);
  const { data: channels, isLoading: loadingChannels } = useChannels();

  const toggleShortcuts = () => setShortcutsOpen(!shortcutsOpen);
  const toggleDirectMessages = () => setDirectMessagesOpen(!directMessagesOpen);
  const toggleChannels = () => setChannelsOpen(!channelsOpen);

  const openCreateChannel = () => setIsCreateChannelOpen(true);
  const closeCreateChannel = () => setIsCreateChannelOpen(false);

  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case ChannelType.TEXT:
        return <Hash className="h-4 w-4" />;
      case ChannelType.VOICE:
        return <Volume2 className="h-4 w-4" />;
      case ChannelType.ANNOUNCEMENT:
        return <Megaphone className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const isLoading = loadingDMs || loadingUsers || loadingChannels;

  return (
    <div className="w-64 border-r border-border flex flex-col h-full bg-card">
      <div className="p-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => router.push("/chat/new")}
        >
          <PlusCircle size={18} />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleShortcuts}
          >
            {shortcutsOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span className="text-sm font-medium">Shortcuts</span>
          </button>

          {shortcutsOpen && (
            <div className="ml-2">
              <Link
                href="/chat"
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                  pathname === "/chat" ? "bg-accent" : ""
                }`}
              >
                <Home size={18} />
                <span className="text-sm">Home</span>
              </Link>
              <Link
                href="/chat/mentions"
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                  pathname === "/chat/mentions" ? "bg-accent" : ""
                }`}
              >
                <AtSign size={18} />
                <span className="text-sm">Mentions</span>
              </Link>
              <Link
                href="/chat/starred"
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                  pathname === "/chat/starred" ? "bg-accent" : ""
                }`}
              >
                <Star size={18} />
                <span className="text-sm">Starred</span>
              </Link>
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="mb-2">
          <div className="flex items-center justify-between p-2">
            <button
              className="flex items-center gap-2 hover:bg-accent rounded-md"
              onClick={toggleChannels}
            >
              {channelsOpen ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <span className="text-sm font-medium">Channels</span>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={openCreateChannel}
              title="Create Channel"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {channelsOpen && (
            <div className="ml-2 space-y-1">
              {loadingChannels ? (
                // Loading state
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
              ) : channels && channels.length > 0 ? (
                // Render channels
                channels.map((channel) => (
                  <Link
                    key={channel._id}
                    href={`/chat/channel/${channel._id}`}
                    className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                      pathname === `/chat/channel/${channel._id}`
                        ? "bg-accent"
                        : ""
                    }`}
                  >
                    {getChannelIcon(channel.type as ChannelType)}
                    <span className="text-sm">{channel.name}</span>
                  </Link>
                ))
              ) : (
                // No channels
                <div className="p-2 text-sm text-muted-foreground">
                  No channels yet
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleDirectMessages}
          >
            {directMessagesOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span className="text-sm font-medium">Direct Messages</span>
          </button>

          {directMessagesOpen && (
            <div className="ml-2">
              {isLoading ? (
                // Loading state
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
              ) : directMessages && directMessages.length > 0 ? (
                // Render direct messages
                directMessages.map((dm: DirectMessage) => {
                  const otherUser = getOtherParticipant(dm);
                  return (
                    <Link
                      key={dm._id}
                      href={`/chat/dm/${dm._id}`}
                      className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                        pathname === `/chat/dm/${dm._id}` ? "bg-accent" : ""
                      }`}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={otherUser?.avatarUrl || ""}
                          alt={otherUser?.displayName || "Unknown"}
                        />
                        <AvatarFallback className="text-xs">
                          {otherUser?.displayName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {otherUser?.displayName || "Unknown User"}
                      </span>
                    </Link>
                  );
                })
              ) : (
                // No direct messages
                <div className="p-2 text-sm text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        isOpen={isCreateChannelOpen}
        onClose={closeCreateChannel}
      />
    </div>
  );
}
