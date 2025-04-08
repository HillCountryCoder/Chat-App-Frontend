"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  useChannel,
  useChannelMessages,
  useChannelMembers,
  useSendChannelMessage,
} from "@/hooks/use-channels";
import { useSocket } from "@/providers/socket-provider";
import { Message, ChannelType } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from "./ChatMessage";
import MessageDate from "./MessageDate";
import { isSameDay } from "date-fns";
import {
  PaperclipIcon,
  Send,
  Loader2,
  Users,
  Phone,
  Video,
  InfoIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import ChannelMembersDrawer from "./ChannelMembersDrawer";

interface ChannelWindowProps {
  channelId: string;
}

export default function ChannelWindow({ channelId }: ChannelWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const {
    data: channel,
    isLoading: channelLoading,
    error: channelError,
  } = useChannel(channelId);

  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useChannelMessages(channelId);

  const { data: members = [], isLoading: membersLoading } =
    useChannelMembers(channelId);

  const sendMessageMutation = useSendChannelMessage();

  // Listen for new messages via socket
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (data: { message: Message }) => {
        if (data.message.channelId === channelId) {
          queryClient.invalidateQueries({
            queryKey: ["messages", "channel", channelId],
          });
        }
      };

      socket.on("new_channel_message", handleNewMessage);

      // Join the channel room
      socket.emit("join_channel", { channelId }, (response: any) => {
        if (!response.success) {
          console.error("Failed to join channel room:", response.error);
        }
      });

      return () => {
        socket.off("new_channel_message", handleNewMessage);

        // Leave the channel room when component unmounts
        socket.emit("leave_channel", { channelId });
      };
    }
  }, [socket, channelId, queryClient]);

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
        channelId,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const toggleMembersDrawer = () => {
    setShowMembers(!showMembers);
  };

  const isLoading = channelLoading || messagesLoading;

  if (channelError) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 text-center text-destructive">
          Error loading channel. The channel may not exist or you don&apos;t
          have access.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-medium">
              {channel?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-medium">{channel?.name}</h2>
              <p className="text-xs text-muted-foreground">
                {channel?.description || `A ${channel?.type} channel`}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {channel?.type === ChannelType.VOICE && (
            <>
              <Button size="icon" variant="ghost">
                <Phone size={18} />
              </Button>
              <Button size="icon" variant="ghost">
                <Video size={18} />
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={toggleMembersDrawer}>
            <Users size={18} />
          </Button>
          <Button size="icon" variant="ghost">
            <InfoIcon size={18} />
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
            <p className="text-sm">Send the first message!</p>
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
                  <ChatMessage message={message} />
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
            disabled={channel?.type === ChannelType.ANNOUNCEMENT}
          />
          <Button
            type="submit"
            size="icon"
            disabled={
              !newMessage.trim() ||
              sendMessageMutation.isPending ||
              channel?.type === ChannelType.ANNOUNCEMENT
            }
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </form>
      </div>

      {/* Channel Members Drawer */}
      {showMembers && (
        <ChannelMembersDrawer
          isOpen={showMembers}
          onClose={toggleMembersDrawer}
          channelId={channelId}
          channel={channel}
        />
      )}
    </div>
  );
}
