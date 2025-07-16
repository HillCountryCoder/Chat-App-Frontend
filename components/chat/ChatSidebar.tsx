"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDirectMessages, useSendMessage } from "@/hooks/use-chat";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectMessage, ChannelType } from "@/types/chat";
import { useUnreadCounts } from "@/hooks/use-unread";
import UnreadBadge from "./UnreadBadge";
import { PresenceAwareAvatar } from "@/components/presence/PresenceAwareAvatar";
import {
  OnlineUsersList,
  OnlineUsersCount,
} from "@/components/presence/OnlineUsersList";
import { ConnectionStatus } from "@/components/presence/ConnectionStatus";
import { useUserPresence } from "@/hooks/use-presence";
import { toast } from "sonner";

export default function ChatSidebar() {
  const [shortcutsOpen, setShortcutsOpen] = useState(true);
  const [directMessagesOpen, setDirectMessagesOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [onlineUsersOpen, setOnlineUsersOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sendMessage = useSendMessage();
  const [creatingDmWithUser, setCreatingDmWithUser] = useState<string | null>(
    null,
  );

  const handleUserClick = async (userId: string) => {
    // Check if DM already exists with this user
    const existingDM = directMessages?.find((dm) => {
      const otherUser = getOtherParticipant(dm);
      return otherUser?._id === userId;
    });

    if (existingDM) {
      // Navigate to existing DM
      router.push(`/chat/dm/${existingDM._id}`);
      return;
    }

    // Create new DM by sending an initial message
    setCreatingDmWithUser(userId);

    try {
      const response = await sendMessage.mutateAsync({
        receiverId: userId,
        content: "👋 Hi there!", // Initial message
        contentType: "text",
      });

      // Navigate to the new conversation
      router.push(`/chat/dm/${response.directMessage._id}`);
      toast.success("Started new conversation");
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setCreatingDmWithUser(null);
    }
  };

  const { data: directMessages, isLoading: loadingDMs } = useDirectMessages();
  // Use our hook for DM users
  const { getOtherParticipant, isLoading: loadingUsers } =
    useDirectMessageUsers(directMessages);

  const { data: channels = [], isLoading: loadingChannels } = useChannels();
  const { getDirectMessageUnreadCount, getChannelUnreadCount } =
    useUnreadCounts();

  // Get user IDs for presence tracking
  const dmUserIds =
    (directMessages
      ?.map((dm) => {
        const otherUser = getOtherParticipant(dm);
        return otherUser?._id;
      })
      .filter(Boolean) as string[]) || [];

  const { presence: dmUsersPresence } = useUserPresence(dmUserIds);

  const toggleShortcuts = () => setShortcutsOpen(!shortcutsOpen);
  const toggleDirectMessages = () => setDirectMessagesOpen(!directMessagesOpen);
  const toggleChannels = () => setChannelsOpen(!channelsOpen);
  const toggleOnlineUsers = () => setOnlineUsersOpen(!onlineUsersOpen);

  const dmUnreadTotal =
    directMessages?.reduce((total, dm) => {
      return total + getDirectMessageUnreadCount(dm._id);
    }, 0) || 0;

  // Calculate total group unread count (simulated for static data)
  const groupUnreadTotal = channels.reduce((total, group) => {
    return total + getChannelUnreadCount(group._id);
  }, 0);
  const isLoading = loadingDMs || loadingUsers || loadingChannels;

  // Get channel icon based on type
  const getChannelIcon = (type: string) => {
    switch (type) {
      case ChannelType.VOICE:
        return <Volume2 size={16} />;
      case ChannelType.ANNOUNCEMENT:
        return <Megaphone size={16} />;
      case ChannelType.TEXT:
      default:
        return <Hash size={16} />;
    }
  };

  const handleNewConversation = () => {
    router.push("/chat/new");
  };

  return (
    <div className="w-64 border-r border-border flex flex-col h-full bg-card">
      <div className="p-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={handleNewConversation}
        >
          <PlusCircle size={18} />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {/* Connection Status */}
        <div className="mb-4 px-2">
          <ConnectionStatus variant="badge" />
        </div>

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

        {/* Online Users section */}
        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleOnlineUsers}
          >
            {onlineUsersOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span className="text-sm font-medium">Online</span>
            <OnlineUsersCount limit={50} />
          </button>

          {onlineUsersOpen && (
            <div className="ml-2 mt-2">
              <OnlineUsersList
                limit={20}
                showHeader={false}
                className="border-0 bg-transparent"
                onUserClick={handleUserClick}
                loadingUserId={creatingDmWithUser}
              />
            </div>
          )}
        </div>

        {/* Channels section */}
        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleChannels}
          >
            {channelsOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span className="text-sm font-medium">Channels</span>
            {groupUnreadTotal > 0 && <UnreadBadge count={groupUnreadTotal} />}
          </button>

          {channelsOpen && (
            <div className="ml-2">
              {loadingChannels ? (
                // Loading state
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <Skeleton className="h-6 w-6 rounded-md" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
              ) : channels && channels.length > 0 ? (
                // Render channels
                channels.map((channel) => {
                  const channelIcon = getChannelIcon(channel.type);
                  const unreadCount = getChannelUnreadCount(channel._id);
                  return (
                    <Link
                      key={channel._id}
                      href={`/chat/channel/${channel._id}`}
                      className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                        pathname === `/chat/channel/${channel._id}`
                          ? "bg-accent"
                          : ""
                      }`}
                    >
                      <div className="text-muted-foreground">{channelIcon}</div>
                      <span className="text-sm truncate">{channel.name}</span>
                      {unreadCount > 0 &&
                        !pathname.includes(`/chat/group/${channel._id}`) && (
                          <UnreadBadge count={unreadCount} />
                        )}
                    </Link>
                  );
                })
              ) : (
                // No channels
                <div className="p-2 text-sm text-muted-foreground">
                  No channels yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Direct Messages section */}
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
            {dmUnreadTotal > 0 && <UnreadBadge count={dmUnreadTotal} />}
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
                  const unreadCount = getDirectMessageUnreadCount(dm._id);
                  return (
                    <Link
                      key={dm._id}
                      href={`/chat/dm/${dm._id}`}
                      className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                        pathname === `/chat/dm/${dm._id}` ? "bg-accent" : ""
                      }`}
                    >
                      <PresenceAwareAvatar
                        userId={otherUser?._id || ""}
                        src={otherUser?.avatarUrl || ""}
                        alt={otherUser?.displayName || "Unknown"}
                        fallback={otherUser?.displayName?.charAt(0) || "?"}
                        size="sm"
                        showPresence={true}
                        presenceSize="sm"
                      />
                      <span className="text-sm truncate">
                        {otherUser?.displayName || "Unknown User"}
                      </span>
                      {unreadCount > 0 &&
                        !pathname.includes(`/chat/dm/${dm._id}`) && (
                          <UnreadBadge count={unreadCount} />
                        )}
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
    </div>
  );
}
