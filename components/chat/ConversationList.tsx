"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDirectMessages } from "@/hooks/use-chat";
import { useDirectMessageUsers } from "@/hooks/use-direct-message-users";
import { useChannels } from "@/hooks/use-channels";
import { Channel, DirectMessage, Message } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Hash } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useAuthStore } from "@/store/auth-store";
import { ChannelType } from "@/types/chat";
import { useUnreadCounts } from "@/hooks/use-unread";
import UnreadBadge from "./UnreadBadge";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket-provider";
import { PresenceAwareAvatar } from "@/components/presence/PresenceAwareAvatar";
import { useUserPresence } from "@/hooks/use-presence";
import { useChatMessenger } from "@/providers/chat-messenger-provider";
import { extractPlainText } from "@/utils/rich-text";

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
  const { messenger, isReady } = useChatMessenger();

  // Get user IDs for presence tracking
  const dmUserIds = useMemo(() => {
    return (
      (directMessages
        ?.map((dm) => {
          const otherUser = getOtherParticipant(dm);
          return otherUser?._id;
        })
        .filter(Boolean) as string[]) || []
    );
  }, [directMessages, getOtherParticipant]);

  const { presence: dmUsersPresence } = useUserPresence(dmUserIds);

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
  const getLastMessagePreview = (dm: DirectMessage | Channel): string => {
    if (!dm.lastMessage) return "No messages yet";

    const message = dm.lastMessage;
    let messageText = message.content;
    if (message.contentType === "rich" && message.richContent) {
      messageText = extractPlainText(message.richContent);
    }

    const editedIndicator = message.isEdited ? " (edited)" : "";
    if (isOwnMessage(message)) {
      return `You: ${messageText}${editedIndicator}`;
    }

    return `${messageText}${editedIndicator}`;
  };

  // Helper function to get sender name from message
  const getSenderName = (message: Message): string => {
    if (typeof message.senderId === "object") {
      return message.senderId.displayName || "Someone";
    }
    return message.sender?.displayName || "Someone";
  };

  // Enhanced notification function that properly handles both DMs and channels
  const notifyParentApp = (
    message: Message,
    conversationType: "dm" | "channel",
    conversationId: string
  ) => {
    // Don't notify for own messages or when messenger not ready
    if (!messenger || !isReady || message.senderId === currentUser?._id) {
      return;
    }

    const senderName = getSenderName(message);

    // Update unread count in messenger cache
    const currentUnreadCount =
      conversationType === "dm"
        ? getDirectMessageUnreadCount(conversationId)
        : getChannelUnreadCount(conversationId);

    messenger.updateUnreadCount(conversationId, currentUnreadCount);

    // Notify parent app
    messenger.notifyNewMessage({
      messageId: message._id,
      sender: senderName,
      content: message.content,
      timestamp: new Date(message.createdAt).getTime(),
      directMessageId: conversationType === "dm" ? conversationId : undefined,
      channelId: conversationType === "channel" ? conversationId : undefined,
      conversationType,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[ConversationList] Notified parent about new ${conversationType} message:`,
        {
          conversationId,
          sender: senderName,
          preview: message.content.substring(0, 30),
          unreadCount: currentUnreadCount,
        }
      );
    }
  };

  // Combine and sort all conversations by last activity
  const unifiedConversations = [
    // Map direct messages to a common format
    ...directMessages.map((dm) => {
      const otherUser = getOtherParticipant(dm);
      const userPresence = dmUsersPresence[otherUser?._id || ""];
      const unreadCount = getDirectMessageUnreadCount(dm._id);

      return {
        id: dm._id,
        type: "dm" as const,
        name: otherUser?.displayName || "Unknown",
        lastActivity: new Date(dm.lastActivity),
        avatar: otherUser?.avatarUrl,
        preview: getLastMessagePreview(dm),
        unreadCount,
        channelType: null,
        originalData: dm,
        userId: otherUser?._id,
        userPresence,
      };
    }),

    // Map channels to the same format
    ...channels.map((channel) => {
      const unreadCount = getChannelUnreadCount(channel._id);

      return {
        id: channel._id,
        type: "channel" as const,
        name: channel.name,
        lastActivity: channel.lastActivity
          ? new Date(channel.lastActivity)
          : new Date(0),
        avatar: null,
        preview: channel.lastMessage
          ? getLastMessagePreview(channel)
          : channel.description || `A ${channel.type} channel`,
        unreadCount,
        channelType: channel.type,
        originalData: channel,
        userId: null,
        userPresence: null,
      };
    }),
  ].sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Enhanced socket listeners with proper notifications for both DMs and channels
  useEffect(() => {
    if (!socket) return;

    const handleNewDirectMessage = (data: { message: Message }) => {
      // Update query cache
      queryClient.invalidateQueries({ queryKey: ["direct-messages"] });

      // Notify parent app about new DM (only if not from current user)
      if (
        data.message.directMessageId &&
        data.message.senderId !== currentUser?._id
      ) {
        notifyParentApp(data.message, "dm", data.message.directMessageId);
      }
    };

    const handleNewChannelMessage = (data: { message: Message }) => {
      // Update channels list when a new message arrives
      queryClient.invalidateQueries({ queryKey: ["channels"] });

      // Notify parent app about new channel message (only if not from current user)
      if (
        data.message.channelId &&
        data.message.senderId !== currentUser?._id
      ) {
        notifyParentApp(data.message, "channel", data.message.channelId);
      }
    };

    // Enhanced message update handlers
    const handleDirectMessageUpdated = (data: {
      message: Message;
      directMessageId: string;
    }) => {
      console.log("Direct message updated in ConversationList:", data);
      queryClient.setQueryData(
        ["direct-messages"],
        (oldData: DirectMessage[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map((dm) => {
            if (
              dm._id === data.directMessageId &&
              dm.lastMessage?._id === data.message._id
            ) {
              return {
                ...dm,
                lastMessage: {
                  ...dm.lastMessage,
                  content: data.message.content,
                  richContent: data.message.richContent,
                  contentType: data.message.contentType,
                  isEdited: true,
                  updatedAt: data.message.editedAt || new Date().toISOString(),
                },
                lastActivity: new Date(),
              };
            }
            return dm;
          });
        }
      );
      queryClient.refetchQueries({
        queryKey: ["direct-messages"],
        exact: true,
      });
    };

    const handleChannelMessageUpdated = (data: {
      message: Message;
      channelId: string;
    }) => {
      console.log("Channel message updated in ConversationList:", data);

      queryClient.setQueryData(
        ["channels"],
        (oldData: Channel[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map((channel) => {
            if (
              channel._id === data.channelId &&
              channel.lastMessage?._id === data.message._id
            ) {
              return {
                ...channel,
                lastMessage: {
                  ...channel.lastMessage,
                  content: data.message.content,
                  richContent: data.message.richContent,
                  contentType: data.message.contentType,
                  isEdited: true,
                },
              };
            }
            return channel;
          });
        }
      );

      // Still refetch in background to ensure consistency
      queryClient.refetchQueries({
        queryKey: ["channels"],
        exact: true,
      });
    };

    // Enhanced reaction update handlers
    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: any[];
      conversationType: "dm" | "channel";
      conversationId: string;
    }) => {
      console.log("Reaction updated in ConversationList:", data);

      // Update the appropriate query based on conversation type
      if (data.conversationType === "dm") {
        queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["channels"] });
      }
    };

    // User activity updates (typing, presence, etc.)
    const handleUserActivity = (data: {
      userId: string;
      activity: string;
      conversationId?: string;
      conversationType?: "dm" | "channel";
    }) => {
      if (process.env.NODE_ENV === "development") {
        console.log("User activity update in ConversationList:", data);
      }

      // Could trigger UI updates for typing indicators, etc.
      // For now, we'll just log it
    };

    // Unread count updates from server
    const handleUnreadCountUpdate = (data: {
      conversationId: string;
      conversationType: "dm" | "channel";
      unreadCount: number;
    }) => {
      console.log("Unread count updated:", data);

      // Update queries to refresh unread counts
      if (data.conversationType === "dm") {
        queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["channels"] });
      }

      // Update messenger cache
      if (messenger && isReady) {
        messenger.updateUnreadCount(data.conversationId, data.unreadCount);
      }
    };

    // Register all socket event listeners
    socket.on("new_direct_message", handleNewDirectMessage);
    socket.on("new_channel_message", handleNewChannelMessage);
    socket.on("message_updated", handleDirectMessageUpdated);
    socket.on("channel_message_updated", handleChannelMessageUpdated);
    socket.on("message_reaction_updated", handleReactionUpdate);
    socket.on("user_activity", handleUserActivity);
    socket.on("unread_count_updated", handleUnreadCountUpdate);

    return () => {
      socket.off("new_direct_message", handleNewDirectMessage);
      socket.off("new_channel_message", handleNewChannelMessage);
      socket.off("message_updated", handleDirectMessageUpdated);
      socket.off("channel_message_updated", handleChannelMessageUpdated);
      socket.off("message_reaction_updated", handleReactionUpdate);
      socket.off("user_activity", handleUserActivity);
      socket.off("unread_count_updated", handleUnreadCountUpdate);
    };
  }, [socket, queryClient, messenger, isReady, currentUser?._id]);

  // Handle mark as read from parent app
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMarkAsRead = (event: Event) => {
      // When parent requests mark as read, we can optionally clear notifications
      if (messenger && isReady) {
        messenger.notifyMessagesRead();
      }

      // Could also trigger specific conversation to be marked as read
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.conversationId) {
        const { conversationId, conversationType } = customEvent.detail;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[ConversationList] Marking ${conversationType} ${conversationId} as read`
          );
        }

        // Update local state or trigger re-fetch
        if (conversationType === "dm") {
          queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        }
      }
    };

    // Enhanced user info update handler
    const handleUserInfoUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.userInfo) {
        console.log("User info updated:", customEvent.detail.userInfo);
        // Could update local user cache or trigger UI updates
      }
    };

    // Theme update handler
    const handleThemeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.theme) {
        console.log("Theme updated:", customEvent.detail.theme);
        // Apply theme changes if needed
      }
    };

    window.addEventListener("chat:markAsRead", handleMarkAsRead);
    window.addEventListener("chat:userInfoUpdate", handleUserInfoUpdate);
    window.addEventListener("chat:themeUpdate", handleThemeUpdate);

    return () => {
      window.removeEventListener("chat:markAsRead", handleMarkAsRead);
      window.removeEventListener("chat:userInfoUpdate", handleUserInfoUpdate);
      window.removeEventListener("chat:themeUpdate", handleThemeUpdate);
    };
  }, [messenger, isReady, queryClient]);

  // Update parent app with total unread count when it changes AND sync individual conversation counts
  useEffect(() => {
    if (!messenger || !isReady) return;

    // Update individual conversation unread counts in messenger cache
    unifiedConversations.forEach((conv) => {
      if (conv.unreadCount > 0) {
        messenger.updateUnreadCount(conv.id, conv.unreadCount);
      } else {
        messenger.clearUnreadCount(conv.id);
      }
    });

    // Calculate and send total unread count
    const totalUnreadCount = unifiedConversations.reduce((total, conv) => {
      return total + conv.unreadCount;
    }, 0);

    messenger.updateMessageCount(totalUnreadCount);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[ConversationList] Updated parent with total unread count: ${totalUnreadCount}`,
        {
          conversations: unifiedConversations.length,
          withUnread: unifiedConversations.filter((c) => c.unreadCount > 0)
            .length,
        }
      );
    }
  }, [unifiedConversations, messenger, isReady]);

  // Sync conversation data with parent app periodically
  useEffect(() => {
    if (!messenger || !isReady) return;

    const syncInterval = setInterval(() => {
      // Send conversation list summary to parent
      const conversationSummary = unifiedConversations.map((conv) => ({
        id: conv.id,
        type: conv.type,
        name: conv.name,
        unreadCount: conv.unreadCount,
        lastActivity: conv.lastActivity.getTime(),
        preview: conv.preview.substring(0, 50),
      }));

      // You could send this to parent app if needed
      if (
        process.env.NODE_ENV === "development" &&
        conversationSummary.length > 0
      ) {
        console.log(
          "[ConversationList] Conversation summary:",
          conversationSummary
        );
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(syncInterval);
  }, [unifiedConversations, messenger, isReady]);

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
            className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
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
                <PresenceAwareAvatar
                  userId={conversation.userId || ""}
                  src={conversation.avatar || ""}
                  alt={conversation.name}
                  fallback={conversation.name?.charAt(0) || "?"}
                  size="md"
                  showPresence={true}
                />
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

                <div className="flex flex-col-reverse items-end gap-2">
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
