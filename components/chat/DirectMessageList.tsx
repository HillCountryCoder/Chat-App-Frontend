// components/chat/DirectMessageList.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useDirectMessages } from "@/hooks/use-chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types/user";
import { DirectMessage, Message } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function DirectMessageList() {
  const {
    data: directMessages,
    isLoading: loadingDMs,
    error: dmError,
  } = useDirectMessages();
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Extract all participant IDs that are not the current user
  const otherParticipantIds = directMessages
    ? directMessages.flatMap((dm) =>
        dm.participantIds.filter((id) => id !== currentUser?._id),
      )
    : [];

  // Fetch all the users for those IDs
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["users", "participants", otherParticipantIds],
    queryFn: async () => {
      if (otherParticipantIds.length === 0) return {};

      // Get each user by ID
      const userPromises = otherParticipantIds.map(async (userId) => {
        try {
          const { data } = await api.get(`/users/${userId}`);
          return data;
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error);
          return null;
        }
      });

      const users = await Promise.all(userPromises);

      // Create a map of user ID to user data
      const userMap: Record<string, User> = {};
      users.filter(Boolean).forEach((user) => {
        if (user && user._id) {
          userMap[user._id] = user;
        }
      });

      return userMap;
    },
    enabled: otherParticipantIds.length > 0,
  });

  const userMap = usersData || {};

  const handleSelectChat = (dmId: string) => {
    router.push(`/chat/dm/${dmId}`);
  };

  // Function to get other participant's data
  const getOtherParticipant = (dm: DirectMessage): User | undefined => {
    if (!currentUser) return undefined;

    const otherParticipantId = dm.participantIds.find(
      (id) => id !== currentUser._id,
    );
    if (!otherParticipantId) return undefined;

    return userMap[otherParticipantId];
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
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(dm.lastActivity), {
                      addSuffix: true,
                    })}
                  </span>
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
