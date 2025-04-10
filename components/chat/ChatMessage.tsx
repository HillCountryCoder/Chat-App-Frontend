import { Message } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types/user";

interface ChatMessageProps {
  message: Message;
  recipient?: User; // Pass recipient from parent component
}

export default function ChatMessage({ message, recipient }: ChatMessageProps) {
  const { user: currentUser } = useAuthStore();

  // Handle both cases: when senderId is a string or an object (populated by MongoDB)
  const senderIdValue =
    typeof message.senderId === "object"
      ? (message.senderId as unknown as User)._id
      : message.senderId;

  // Get sender data from populated field if available
  const senderData =
    typeof message.senderId === "object"
      ? (message.senderId as unknown as User)
      : message.sender;

  const isOwnMessage = senderIdValue === currentUser?._id;

  // Only fetch if we don't already have sender data
  const { data: sender } = useQuery({
    queryKey: ["user", senderIdValue],
    queryFn: async () => {
      // Don't fetch if it's the current user's message
      if (isOwnMessage) return currentUser;

      // If we already have sender data from the populated field, use that
      if (senderData) return senderData;

      // If sender is the recipient, use that data
      if (recipient && recipient._id === senderIdValue) {
        return recipient;
      }

      // Otherwise fetch the user data
      const { data } = await api.get(`/users/${senderIdValue}`);
      return data;
    },
    // Only fetch if needed and if we have an ID
    enabled:
      !!senderIdValue &&
      !senderData &&
      !isOwnMessage &&
      (!recipient || recipient._id !== senderIdValue),
  });

  // Determine which user data to use
  const messageUser = isOwnMessage
    ? currentUser
    : senderData || sender || recipient;

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
            src={
              messageUser?.displayName
                ? messageUser?.displayName
                : messageUser?.avatarUrl
            }
            alt={messageUser?.displayName || ""}
          />
          <AvatarFallback className="bg-primary/20">
            {messageUser?.displayName?.charAt(0,2) || "?"}
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
              ? "bg-chat-message-bg text-chat-message-fg rounded-br-none"
              : "bg-muted text-foreground rounded-bl-none",
          )}
        >
          <p>{message.content}</p>
        </div>

        <div
          className={cn(
            "flex items-center mt-1 text-xs text-muted-chat-fg",
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
