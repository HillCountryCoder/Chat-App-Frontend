"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDirectMessages } from "@/hooks/use-chat";
import { useDirectMessageUsers } from "@/hooks/use-direct-message-users";
import { useChannels } from "@/hooks/use-channels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage, Message } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Hash } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useAuthStore } from "@/store/auth-store";
import { ChannelType } from "@/types/chat";
import { useUnreadCounts } from "@/hooks/use-unread";
import UnreadBadge from "./UnreadBadge";

export default function ConversationList() {
  const {
    data: directMessages = [],
    isLoading: loadingDMs,
    error: dmError,
  } = useDirectMessages();

  const { getOtherParticipant, isLoading: loadingUsers } =
    useDirectMessageUsers(directMessages);

  const {
    data: channels = [],
    isLoading: loadingChannels,
    error: channelsError,
  } = useChannels();

  const { getDirectMessageUnreadCount, getChannelUnreadCount } =
    useUnreadCounts();

  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser } = useAuthStore();

  const handleSelectDM = (dmId: string) => {
    router.push(`/chat/dm/${dmId}`);
  };

  const handleSelectChannel = (channelId: string) => {
    router.push(`/chat/channel/${channelId}`);
  };

  // Function to determine if a message is from the current user
  const isOwnMessage = (message: Message): boolean => {
    return message?.senderId === currentUser?._id;
  };

  // Format last message preview
  const getLastMessagePreview = (dm: DirectMessage): string => {
    if (!dm.lastMessage) return "No messages yet";

    const message = dm.lastMessage;

    if (isOwnMessage(message)) {
      return `You: ${message.content}`;
    }

    return message.content;
  };

  // Combine and sort all conversations by last activity
  const unifiedConversations = useMemo(() => {
    const allConversations = [
      // Map direct messages to a common format
      ...directMessages.map((dm) => ({
        id: dm._id,
        type: "dm",
        name: getOtherParticipant(dm)?.displayName || "Unknown",
        lastActivity: new Date(dm.lastActivity),
        avatar: getOtherParticipant(dm)?.avatarUrl,
        preview: getLastMessagePreview(dm),
        unreadCount: getDirectMessageUnreadCount(dm._id),
        channelType: null,
        originalData: dm,
      })),

      // Map channels to the same format
      ...channels.map((channel) => ({
        id: channel._id,
        type: "channel",
        name: channel.name,
        lastActivity: channel.lastActivity
          ? new Date(channel.lastActivity)
          : new Date(0),
        avatar: null,
        preview: channel.lastMessage
          ? channel.lastMessage?.content
          : channel.description || `A ${channel.type} channel`,
        unreadCount: getChannelUnreadCount(channel._id),
        channelType: channel.type,
        originalData: channel,
      })),
    ];

    // Sort by last activity (most recent first)
    return allConversations.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );
  }, [
    directMessages,
    channels,
    getOtherParticipant,
    getDirectMessageUnreadCount,
    getChannelUnreadCount,
  ]);

  const isLoading = loadingDMs || loadingUsers || loadingChannels;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if ((dmError || channelsError) && unifiedConversations.length === 0) {
    return (
      <div className="p-4 text-destructive">
        Error loading conversations. Please try again.
      </div>
    );
  }

  if (unifiedConversations.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Start messaging with friends, colleagues, or create a new group chat."
        icon={<MessageSquare size={48} />}
        action={{
          label: "Start a new conversation",
          onClick: () => router.push("/chat/new"),
        }}
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {unifiedConversations.map((conversation) => {
        const isActive =
          conversation.type === "dm"
            ? pathname === `/chat/dm/${conversation.id}`
            : pathname === `/chat/channel/${conversation.id}`;

        return (
          <div
            key={`${conversation.type}-${conversation.id}`}
            className={`p-4 hover:bg-accent cursor-pointer ${
              isActive ? "bg-accent" : ""
            }`}
            onClick={() =>
              conversation.type === "dm"
                ? handleSelectDM(conversation.id)
                : handleSelectChannel(conversation.id)
            }
          >
            <div className="flex items-center gap-3">
              {conversation.type === "dm" ? (
                <Avatar>
                  <AvatarImage
                    src={conversation.avatar || ""}
                    alt={conversation.name}
                  />
                  <AvatarFallback>
                    {conversation.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Hash className="h-5 w-5" />
                </div>
              )}

              <div className="flex justify-between min-w-0 w-[100%]">
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium truncate flex items-center gap-2">
                    {conversation.name}
                    {conversation.channelType === ChannelType.ANNOUNCEMENT && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Announcement
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.preview}
                  </p>
                </div>

                <div className="flex flex-col-reverse items-end  gap-2">
                  {!isActive && conversation.unreadCount > 0 && (
                    <UnreadBadge count={conversation.unreadCount} />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(conversation.lastActivity, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
