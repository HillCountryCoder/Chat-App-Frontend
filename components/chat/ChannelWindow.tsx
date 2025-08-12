/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  useChannel,
  useChannelMessages,
  useChannelMembers,
  useSendChannelMessage,
} from "@/hooks/use-channels";
import { useSocket } from "@/providers/socket-provider";
import { Message, ChannelType, Reaction } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from "./ChatMessage";
import MessageDate from "./MessageDate";
import { isSameDay } from "date-fns";
import {
  PaperclipIcon,
  Send,
  Users,
  Phone,
  Video,
  InfoIcon,
  Reply,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import ChannelMembersDrawer from "./ChannelMembersDrawer";
import { useMarkAsRead } from "@/hooks/use-unread";
import { Edit, Clock, Type, Loader2 } from "lucide-react";
import { useMessageEditing } from "@/hooks/use-message-editing";
import { useEditChannelMessage } from "@/hooks/use-channels"; // or wherever your channel hooks are
import RichTextEditor from "./RichTextEditor";
import { hasContent } from "@/utils/rich-text";
import { ContentTypeEnum } from "@/types/chat";
import { InlineRichTextRenderer } from "./RichTextRenderer";
interface ChannelWindowProps {
  channelId: string;
}

export default function ChannelWindow({ channelId }: ChannelWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const { markChannelAsRead } = useMarkAsRead();
  const hasMarkedAsReadRef = useRef(false);
  const queryClientRef = useRef(queryClient);
  const markAsReadRef = useRef(markChannelAsRead);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Reaction[]>
  >({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isRichTextMode, setIsRichTextMode] = useState(false);
  const [richContent, setRichContent] = useState<any[]>([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);
  // Update refs when their values change
  useEffect(() => {
    queryClientRef.current = queryClient;
    markAsReadRef.current = markChannelAsRead;
  }, [queryClient, markChannelAsRead]);

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

  // Reset the ref when channelId changes
  useEffect(() => {
    // Mark as read only once per channel visit
    if (channelId && !hasMarkedAsReadRef.current) {
      markAsReadRef.current.mutate(channelId);
      hasMarkedAsReadRef.current = true;
    }

    // Reset when unmounting or changing channels
    return () => {
      hasMarkedAsReadRef.current = false;
    };
  }, [channelId]);

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
  // Replace the existing handleMessageUpdated handler and socket listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: Message }) => {
      if (data.message.channelId === channelId) {
        // Invalidate the query to get new messages
        queryClientRef.current.invalidateQueries({
          queryKey: ["messages", "channel", channelId],
        });

        // Mark the new message as read since we're in the channel
        if (hasMarkedAsReadRef.current) {
          markAsReadRef.current.mutate(channelId);
        }
      }
    };

    // Fix: Change the event name from "channel_message_updated" to "message_updated"
    const handleMessageUpdated = (data: {
      message: Message;
      channelId: string;
    }) => {
      console.log("Channel message updated:", data);
      if (data.channelId === channelId) {
        queryClientRef.current.invalidateQueries({
          queryKey: ["messages", "channel", channelId],
        });
      }
    };

    socket.on("new_channel_message", handleNewMessage);
    socket.on("message_updated", handleMessageUpdated); // Fixed: was "channel_message_updated"

    // Join the channel room only once when component mounts
    socket.emit(
      "join_channel",
      { channelId },
      (response: { success: boolean; error?: string }) => {
        if (!response.success) {
          console.error("Failed to join channel room:", response.error);
        }
      },
    );

    return () => {
      socket.off("new_channel_message", handleNewMessage);
      socket.off("message_updated", handleMessageUpdated); // Fixed: was "channel_message_updated"

      // Leave the channel room when component unmounts
      socket.emit("leave_channel", { channelId });
    };
  }, [socket, channelId]);

  useEffect(() => {
    if (!socket) return;

    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      setMessageReactions((prev) => ({
        ...prev,
        [data.messageId]: data.reactions,
      }));
    };

    socket.on("message_reaction_updated", handleReactionUpdate);

    return () => {
      socket.off("message_reaction_updated", handleReactionUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !channelId) return;

    // Join the channel-specific room for receiving reactions and other updates
    socket.emit(
      "join_channel_room",
      { channelId },
      (response: { success: boolean; error?: string }) => {
        if (!response.success) {
          console.error("Failed to join channel room:", response.error);
        }
      },
    );

    return () => {
      // Leave the channel room when unmounting
      socket.emit("leave_channel_room", { channelId });
    };
  }, [socket, channelId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine content and type based on mode
    let content: string;
    let contentType: any;
    let richContentData: any;

    if (isRichTextMode) {
      content = extractPlainTextFromRichContent(richContent);
      contentType = ContentTypeEnum.RICH;
      richContentData = richContent;

      if (!hasContent(richContent)) return;
    } else {
      content = newMessage.trim();
      contentType = ContentTypeEnum.TEXT;

      if (!content) return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        content: content || "📎",
        channelId,
        replyToId: replyingTo?._id,
        // Add these if your channel message mutation supports rich content
        richContent: richContentData,
        contentType,
      });

      // Clear both input types
      setNewMessage("");
      setRichContent([
        {
          type: "paragraph",
          children: [{ text: "" }],
        },
      ]);
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const toggleMembersDrawer = () => {
    setShowMembers(!showMembers);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const extractPlainTextFromRichContent = (richContent: any[]): string => {
    const extractText = (nodes: any[]): string => {
      return nodes
        .map((node) => {
          if (node.text !== undefined) {
            return node.text;
          }
          if (node.children) {
            return extractText(node.children);
          }
          return "";
        })
        .join("");
    };

    return extractText(richContent).trim();
  };

  const toggleRichTextMode = () => {
    if (isRichTextMode) {
      const plainText = extractPlainTextFromRichContent(richContent);
      setNewMessage(plainText);
      setIsRichTextMode(false);
    } else {
      setRichContent([
        {
          type: "paragraph",
          children: [{ text: newMessage }],
        },
      ]);
      setIsRichTextMode(true);
    }
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
                <Fragment
                  key={`${message._id}-${message.isEdited}-${
                    message.editedAt || ""
                  }-${reactionsKey}`}
                >
                  {showDateSeparator && (
                    <MessageDate date={message.createdAt} />
                  )}
                  <ChatMessage
                    message={messageWithReactions}
                    onReply={handleReply}
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
        {replyingTo && (
          <div className="px-4 py-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="w-1 bg-primary/50 rounded-full h-12 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Reply className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Replying to
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {typeof replyingTo.senderId === "object"
                        ? replyingTo.senderId.displayName
                        : replyingTo.sender?.displayName || "Unknown"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {replyingTo.contentType === ContentTypeEnum.RICH &&
                    replyingTo.richContent ? (
                      <InlineRichTextRenderer
                        content={replyingTo.richContent}
                        maxLength={80}
                      />
                    ) : (
                      replyingTo.content
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={cancelReply}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button type="button" size="icon" variant="ghost">
            <PaperclipIcon size={18} />
          </Button>

          <Button
            type="button"
            size="icon"
            variant={isRichTextMode ? "default" : "ghost"}
            onClick={toggleRichTextMode}
            title={
              isRichTextMode ? "Switch to plain text" : "Switch to rich text"
            }
          >
            <Type size={18} />
          </Button>

          {isRichTextMode ? (
            <div className="flex-1">
              <RichTextEditor
                value={richContent}
                onChange={setRichContent}
                placeholder="Type a message... Press Ctrl+Enter to send, Enter for new line"
                submitOnEnter={false}
                onSubmit={() => handleSendMessage(new Event("submit") as any)}
                minHeight={40}
                maxHeight={120}
                className="border-0"
              />
            </div>
          ) : (
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={channel?.type === ChannelType.ANNOUNCEMENT}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          )}

          <Button
            type="submit"
            size="icon"
            disabled={
              (!newMessage.trim() && !isRichTextMode) ||
              (isRichTextMode && !hasContent(richContent)) ||
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
