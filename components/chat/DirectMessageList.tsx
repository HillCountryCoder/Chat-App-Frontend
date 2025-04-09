"use client";

import { useRouter, usePathname } from "next/navigation";
import { useDirectMessages } from "@/hooks/use-chat";
import { useDirectMessageUsers } from "@/hooks/use-direct-message-users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage, Message } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useAuthStore } from "@/store/auth-store";
import { useUnreadCounts } from "@/hooks/use-unread";
import UnreadBadge from "./UnreadBadge";

export default function DirectMessageList() {
  const {
    data: directMessages,
    isLoading: loadingDMs,
    error: dmError,
  } = useDirectMessages();

  const { getOtherParticipant, isLoading: loadingUsers } =
    useDirectMessageUsers(directMessages);

  const { getDirectMessageUnreadCount } = useUnreadCounts();

  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser } = useAuthStore();

  const handleSelectChat = (dmId: string) => {
    router.push(`/chat/dm/${dmId}`);
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

  const isLoading = loadingDMs || loadingUsers;

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

  if (dmError) {
    return (
      <div className="p-4 text-destructive">
        Error loading conversations. Please try again.
      </div>
    );
  }

  if (!directMessages || directMessages.length === 0) {
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
      {directMessages.map((dm) => {
        const isActive = pathname === `/chat/dm/${dm._id}`;
        const otherUser = getOtherParticipant(dm);
        const unreadCount = getDirectMessageUnreadCount(dm._id);

        return (
          <div
            key={dm._id}
            className={`p-4 hover:bg-accent cursor-pointer ${
              isActive ? "bg-accent" : ""
            }`}
            onClick={() => handleSelectChat(dm._id)}
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage
                  src={otherUser?.avatarUrl || ""}
                  alt={otherUser?.displayName || "Unknown"}
                />
                <AvatarFallback>
                  {otherUser?.displayName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium truncate">
                    {otherUser?.displayName || "Unknown User"}
                  </h3>
                  <div className="flex items-center gap-2">
                    {!isActive && unreadCount > 0 && (
                      <UnreadBadge count={unreadCount} />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(dm.lastActivity), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {getLastMessagePreview(dm)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
