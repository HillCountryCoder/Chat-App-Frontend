import { Message } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useAuthStore();
  const isOwnMessage = message.senderId == user?._id;

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[80%] mb-4",
        isOwnMessage ? "ml-auto flex-row-reverse" : "",
      )}
    >
      {!isOwnMessage && (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={message.sender?.avatarUrl || ""}
            alt={message.sender?.displayName || ""}
          />
          <AvatarFallback>
            {message.sender?.displayName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-col">
        <div
          className={cn(
            "p-3 rounded-lg",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-muted rounded-tl-none",
          )}
        >
          <p>{message.content}</p>
        </div>
        <div
          className={cn(
            "text-xs text-muted-foreground mt-1",
            isOwnMessage ? "text-right" : "text-left",
          )}
        >
          {format(new Date(message.createdAt), "h:mm a")}
          {message.isEdited && <span className="ml-1">(edited)</span>}
        </div>
      </div>
    </div>
  );
}
