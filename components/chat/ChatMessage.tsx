// components/chat/ChatMessage.tsx
import { Message } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ChatMessageProps {
  message: Message;
  recipient?: any; // Pass recipient from parent component
}

export default function ChatMessage({ message, recipient }: ChatMessageProps) {
  const { user: currentUser } = useAuthStore();
  const isOwnMessage = message.senderId === currentUser?._id;

  // If not own message and no sender info, fetch the sender
  const { data: sender } = useQuery({
    queryKey: ["user", message.senderId],
    queryFn: async () => {
      // Don't fetch if it's the current user's message
      if (isOwnMessage) return currentUser;

      // If sender is the recipient, use that data
      if (recipient && recipient._id === message.senderId) {
        return recipient;
      }

      // Otherwise fetch the user data
      const { data } = await api.get(`/users/${message.senderId}`);
      return data;
    },
    // Only fetch if needed and if we have an ID
    enabled:
      !!message.senderId &&
      !isOwnMessage &&
      (!recipient || recipient._id !== message.senderId),
  });

  // Determine which user data to use
  const messageUser = isOwnMessage ? currentUser : sender || recipient;

  return (
    <div
      className={cn(
        "flex items-end mb-4",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage
            src={messageUser?.avatarUrl || ""}
            alt={messageUser?.displayName || ""}
          />
          <AvatarFallback className="bg-primary/20">
            {messageUser?.displayName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[65%]",
          isOwnMessage ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "px-4 py-2 rounded-2xl",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted text-foreground rounded-bl-none",
          )}
        >
          <p>{message.content}</p>
        </div>

        <div
          className={cn(
            "flex items-center mt-1 text-xs text-muted-foreground",
            isOwnMessage ? "justify-end" : "justify-start",
          )}
        >
          <span>{format(new Date(message.createdAt), "h:mm a")}</span>
          {isOwnMessage && (
            <div className="ml-1 flex items-center">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
