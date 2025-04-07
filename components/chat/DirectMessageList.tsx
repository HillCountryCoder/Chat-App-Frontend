// components/chat/DirectMessageList.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useDirectMessages } from "@/hooks/use-chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types/user";
import { DirectMessage } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "./EmptyState";

export default function DirectMessageList() {
  const { data: directMessages, isLoading, error } = useDirectMessages();
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectChat = (dmId: string) => {
    router.push(`/chat/dm/${dmId}`);
  };
  // TODO: the logic is not correct here we should fetch all users and then using participantIDs filter other participant and show its details
  // Function to get other participant's display name
  const getOtherParticipantName = (dm: any): string => {
    if (!user || !dm.participants) {
      return "Unknown User";
    }

    const otherParticipant = dm.participants.find(
      (p: User) => p._id !== user._id,
    );
    return otherParticipant?.displayName || "Unknown User";
  };
  // TODO: the type of dm should ideally be DirectMessage we should be checking participantIds and not participants
  // Function to get the avatar for the other participant
  const getOtherParticipantAvatar = (
    dm: any,
  ): { src: string; fallback: string } => {
    if (!user || !dm.participants) {
      return { src: "", fallback: "?" };
    }

    const otherParticipant = dm.participants.find(
      (p: User) => p._id !== user._id,
    );
    return {
      src: otherParticipant?.avatarUrl || "",
      fallback: otherParticipant?.displayName?.charAt(0) || "?",
    };
  };

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

  if (error) {
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
      {directMessages.map((dm: any) => {
        const isActive = pathname === `/chat/dm/${dm._id}`;
        const avatar = getOtherParticipantAvatar(dm);

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
                <AvatarImage src={avatar.src} alt="User avatar" />
                <AvatarFallback>{avatar.fallback}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium truncate">
                    {getOtherParticipantName(dm)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(dm.lastActivity), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {dm.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate">
                    {dm.lastMessage.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
