import { Fragment, useEffect, useRef, useState } from "react";
import { useMessages, useSendMessage, useRecipient } from "@/hooks/use-chat";
import { useSocket } from "@/providers/socket-provider";
import { Message, Reaction } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from "./ChatMessage";
import MessageDate from "./MessageDate";
import { Phone, Video, Paperclip, Send, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { useMarkAsRead } from "@/hooks/use-unread";

interface ChatWindowProps {
  directMessageId: string;
  recipientId?: string;
}

export default function ChatWindow({
  directMessageId,
  recipientId,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Reaction[]>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { markDirectMessageAsRead } = useMarkAsRead();

  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useMessages(undefined, directMessageId);

  const { data: recipient, isLoading: recipientLoading } =
    useRecipient(recipientId);

  const sendMessageMutation = useSendMessage();
  useEffect(() => {
    if (!socket || !directMessageId) return;

    // Join the direct message room immediately when component mounts
    socket.emit("join_direct_message", { directMessageId });

    return () => {
      // Leave the room when component unmounts
      socket.emit("leave_direct_message", { directMessageId });
    };
  }, [socket, directMessageId]);
  // Mark messages as read when entering the chat
  useEffect(() => {
    if (directMessageId) {
      markDirectMessageAsRead.mutate(directMessageId);
    }
  }, [directMessageId, markDirectMessageAsRead]);

  // Initialize message reactions
  useEffect(() => {
    const reactionsMap: Record<string, Reaction[]> = {};

    messages.forEach((message) => {
      if (message.reactions && message.reactions.length > 0) {
        reactionsMap[message._id] = message.reactions;
      }
    });

    setMessageReactions(reactionsMap);
  }, [messages]);

  // Listen for new messages via socket
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (data: { message: Message }) => {
        if (data.message.directMessageId === directMessageId) {
          // Invalidate the query to get new messages
          queryClient.invalidateQueries({
            queryKey: ["messages", "direct", directMessageId],
          });

          // Mark the new message as read since we're in the conversation
          markDirectMessageAsRead.mutate(directMessageId);
        }
      };

      socket.on("new_direct_message", handleNewMessage);

      return () => {
        socket.off("new_direct_message", handleNewMessage);
      };
    }
  }, [socket, directMessageId, queryClient, markDirectMessageAsRead]);

  // In ChatWindow.tsx, update the message reactions effect
  useEffect(() => {
    if (!socket) return;

    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      console.log("Received reaction update in ChatWindow", data);

      // Update local state
      setMessageReactions((prev) => {
        const newState = { ...prev };
        newState[data.messageId] = [...data.reactions]; // Make sure to create a new array
        return newState;
      });
    };

    socket.on("message_reaction_updated", handleReactionUpdate);

    return () => {
      socket.off("message_reaction_updated", handleReactionUpdate);
    };
  }, [socket]); // Only depend on socket

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messageReactions]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    sendMessageMutation.mutate(
      {
        content: newMessage,
        directMessageId,
      },
      {
        onSuccess: () => {
          setNewMessage("");
        },
        onError: (error) => {
          console.error("Failed to send message:", error);
        },
      },
    );
  };

  // Check if two dates are the same day (without date-fns)
  const areSameDay = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  // Format time (last active)
  const formatLastActive = (dateString?: string) => {
    if (!dateString) return "Unknown";

    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60)
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const isLoading = messagesLoading || recipientLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar>
                <AvatarImage
                  src={recipient?.avatarUrl || ""}
                  alt={recipient?.displayName || ""}
                />
                <AvatarFallback>
                  {recipient?.displayName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                  recipient?.status === "online"
                    ? "bg-green-500"
                    : "bg-gray-400"
                }`}
              ></div>
            </div>
            <div>
              <h2 className="font-medium">{recipient?.displayName}</h2>
              <p className="text-xs text-muted-foreground">
                {recipient?.status === "online"
                  ? "Active now"
                  : `Last active ${formatLastActive(recipient?.lastSeen)}`}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="icon" variant="ghost">
            <Phone size={18} />
          </Button>
          <Button size="icon" variant="ghost">
            <Video size={18} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {messagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messagesError ? (
          <div className="flex justify-center items-center h-full text-destructive">
            Error loading messages. Please try again.
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          <>
            {/* Reverse the messages array to show oldest first */}
            {[...messages].reverse().map((message, index, reversedArray) => {
              // Check if we need to display a date separator
              const showDateSeparator =
                index === 0 ||
                !areSameDay(
                  reversedArray[index - 1].createdAt,
                  message.createdAt,
                );

              // Get reactions for this message
              const reactions =
                messageReactions[message._id] || message.reactions || [];

              // Create a new message object with reactions
              const messageWithReactions = {
                ...message,
                reactions,
              };
              const reactionsKey = messageReactions[message._id]
                ? messageReactions[message._id]
                    .map((r) => `${r.emoji}-${r.count}`)
                    .join("_")
                : "no-reactions";
              return (
                <Fragment key={`${message._id}-${reactionsKey}`}>
                  {showDateSeparator && (
                    <MessageDate date={message.createdAt} />
                  )}
                  <ChatMessage
                    message={messageWithReactions}
                    recipient={recipient}
                  />
                </Fragment>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => {}}>
            <Paperclip size={18} />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
