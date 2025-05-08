import { useRef, useState } from "react";
import { Message, Reaction } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, SmilePlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types/user";
import MessageReactions from "./MessageReactions";
import MessageReactionMenu from "./MessageReactionMenu";
import { useSocket } from "@/providers/socket-provider";
import { Button } from "../ui/button";
import { useReaction } from "@/hooks/use-reaction";

interface ChatMessageProps {
  message: Message;
  recipient?: User; // Pass recipient from parent component
}

interface ReactionResponse {
  success: boolean;
  reactions: Reaction[];
}

export default function ChatMessage({ message, recipient }: ChatMessageProps) {
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();
  const [localReactions, setLocalReactions] = useState(message.reactions || []);
  const messageRef = useRef<HTMLDivElement>(null);
  const [showPickerTrigger, setShowPickerTrigger] = useState(false);

  // Use our reaction context
  const {
    activeMessageId,
    setActiveMessageId,
    isMenuOpen,
    setIsMenuOpen,
    closeAllMenus,
  } = useReaction();

  // Check if this message's menu is active
  const isActive = activeMessageId === message._id;

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

  // Toggle the reaction menu
  const toggleReactionMenu = () => {
    if (isActive) {
      // If this message's menu is already open, close it
      closeAllMenus();
    } else {
      // Otherwise, set this message as active and open its menu
      setActiveMessageId(message._id);
      setIsMenuOpen(true);
    }
  };

  // Handle reaction selection
  const handleReactionSelect = (emoji: string) => {
    if (!socket || !currentUser) return;

    const existingReaction = localReactions.find((r) => r.emoji === emoji);
    const userReacted = existingReaction?.users.includes(currentUser._id);

    if (userReacted) {
      // User already reacted, so remove reaction
      socket.emit(
        "remove_reaction",
        { messageId: message._id, emoji },
        (response: ReactionResponse) => {
          if (response.success) {
            setLocalReactions(response.reactions);
          }
        },
      );
    } else {
      // User hasn't reacted, so add reaction
      socket.emit(
        "add_reaction",
        { messageId: message._id, emoji },
        (response: ReactionResponse) => {
          if (response.success) {
            setLocalReactions(response.reactions);
          }
        },
      );
    }

    // Close the menu after selecting
    closeAllMenus();
  };

  // Update reactions when they change
  const handleReactionsChange = (messageId: string, reactions: Reaction[]) => {
    if (messageId === message._id) {
      setLocalReactions(reactions);
    }
  };

  // Format time (HH:MM AM/PM) without using date-fns
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Show emoji trigger only if no menu is open or this message's menu is open
  const shouldShowTrigger = !isMenuOpen || isActive;

  return (
    <div
      className={cn(
        "group relative flex items-end mb-4",
        isOwnMessage ? "justify-end" : "justify-start",
        isActive && "z-10", // Increase z-index when active
      )}
      ref={messageRef}
      onMouseEnter={() => shouldShowTrigger && setShowPickerTrigger(true)}
      onMouseLeave={() => !isActive && setShowPickerTrigger(false)}
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
          className={`flex ${
            isOwnMessage ? "flex-row-reverse" : ""
          } items-center gap-2`}
        >
          <div
            className={cn(
              "px-4 py-2 rounded-2xl transition-colors",
              isOwnMessage
                ? "bg-chat-message-bg text-chat-message-fg rounded-br-none"
                : "bg-muted text-foreground rounded-bl-none",
              isActive && "shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.2)]", // Highlight when active
            )}
          >
            <p>{message.content}</p>
          </div>
          {(showPickerTrigger || isActive) && shouldShowTrigger && (
            <Button
              variant="ghost"
              className="p-1 cursor-pointer hover:bg-accent/20 hover:rounded-full"
              onClick={toggleReactionMenu}
              data-reaction-trigger="true"
            >
              <SmilePlus className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div
          className={cn(
            "flex items-center mt-1 text-xs text-muted-chat-fg",
            isOwnMessage ? "justify-end" : "justify-start",
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwnMessage && (
            <div className="ml-1 flex items-center">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>

        {localReactions.length > 0 && (
          <MessageReactions
            messageId={message._id}
            reactions={localReactions}
            onReactionChange={handleReactionsChange}
          />
        )}
      </div>

      {/* Reaction menu (visible only when this message is active) */}
      {isActive && (
        <div
          className={cn(
            "absolute -top-10",
            isOwnMessage ? "right-0" : "left-10",
          )}
          data-reaction-menu="true"
        >
          <MessageReactionMenu
            messageId={message._id}
            onReactionSelect={handleReactionSelect}
          />
        </div>
      )}
    </div>
  );
}
