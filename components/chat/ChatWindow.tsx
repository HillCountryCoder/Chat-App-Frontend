/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useMessages, useSendMessage, useRecipient } from "@/hooks/use-chat";
import { useAuthStore } from "@/store/auth-store";
import { useSocket } from "@/providers/socket-provider";
import { Message } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from "./ChatMessage";
import MessageDate from "./MessageDate";
import { isSameDay } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { Phone, Video, PaperclipIcon, Send, Loader2 } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const { user } = useAuthStore();
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

  // Mark messages as read when entering the chat
  useEffect(() => {
    let isMounted = true;

    if (directMessageId) {
      markDirectMessageAsRead.mutate(directMessageId);
    }

    return () => {
      isMounted = false;
    };
  }, [directMessageId]);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        content: newMessage,
        directMessageId,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
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
                  : "Last active " +
                    formatDistanceToNow(new Date(), { addSuffix: true })}
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
                !isSameDay(
                  new Date(reversedArray[index - 1].createdAt),
                  new Date(message.createdAt),
                );

              return (
                <Fragment key={message._id}>
                  {showDateSeparator && (
                    <MessageDate date={message.createdAt} />
                  )}
                  <ChatMessage message={message} recipient={recipient} />
                </Fragment>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button type="button" size="icon" variant="ghost">
            <PaperclipIcon size={18} />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
