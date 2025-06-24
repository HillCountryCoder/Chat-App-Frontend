import { useRef, useState } from "react";
import { Message, Reaction } from "@/types/chat";
import { Attachment } from "@/types/attachment";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, MoreVertical, Reply, SmilePlus, Type } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types/user";
import MessageReactions from "./MessageReactions";
import MessageReactionMenu from "./MessageReactionMenu";
import AttachmentDisplay from "./AttachmentDisplay";
import RichTextRenderer from "./RichTextRenderer";
import { useSocket } from "@/providers/socket-provider";
import { Button } from "../ui/button";
import { useReaction } from "@/hooks/use-reaction";
import type { Value } from "platejs";

interface ChatMessageProps {
  message: Message & {
    richContent?: Value;
    contentType?: "text" | "rich" | "image" | "file" | "code" | "system";
  };
  recipient?: User;
  onReply?: (message: Message) => void;
  onPreviewAttachment?: (
    attachment: Attachment,
    attachments?: Attachment[],
  ) => void;
}

interface ReactionResponse {
  success: boolean;
  reactions: Reaction[];
}

export default function ChatMessage({
  message,
  recipient,
  onReply,
  onPreviewAttachment,
}: ChatMessageProps) {
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();
  const [localReactions, setLocalReactions] = useState(message.reactions || []);
  const messageRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);
  const {
    activeMessageId,
    setActiveMessageId,
    isMenuOpen,
    setIsMenuOpen,
    closeAllMenus,
  } = useReaction();

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };
  const isActive = activeMessageId === message._id;

  const senderIdValue =
    typeof message.senderId === "object"
      ? (message.senderId as unknown as User)._id
      : message.senderId;

  const senderData =
    typeof message.senderId === "object"
      ? (message.senderId as unknown as User)
      : message.sender;

  const isOwnMessage = senderIdValue === currentUser?._id;

  const { data: sender } = useQuery({
    queryKey: ["user", senderIdValue],
    queryFn: async () => {
      if (isOwnMessage) return currentUser;
      if (senderData) return senderData;
      if (recipient && recipient._id === senderIdValue) {
        return recipient;
      }
      const { data } = await api.get(`/users/${senderIdValue}`);
      return data;
    },
    enabled:
      !!senderIdValue &&
      !senderData &&
      !isOwnMessage &&
      (!recipient || recipient._id !== senderIdValue),
  });

  const messageUser = isOwnMessage
    ? currentUser
    : senderData || sender || recipient;

  const toggleReactionMenu = () => {
    if (isActive) {
      closeAllMenus();
    } else {
      setActiveMessageId(message._id);
      setIsMenuOpen(true);
    }
  };

  const handleReactionSelect = (emoji: string) => {
    if (!socket || !currentUser) return;

    const existingReaction = localReactions.find((r) => r.emoji === emoji);
    const userReacted = existingReaction?.users.includes(currentUser._id);

    if (userReacted) {
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

    closeAllMenus();
  };

  const handleReactionsChange = (messageId: string, reactions: Reaction[]) => {
    if (messageId === message._id) {
      setLocalReactions(reactions);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const shouldShowTrigger = !isMenuOpen || isActive;

  // Check if message has content or attachments
  const hasTextContent = message.content && message.content.trim() !== "📎";
  const hasRichContent = message.contentType === "rich" && message.richContent;
  const hasAttachments = message.attachments && message.attachments.length > 0;

  const readyAttachments =
    message.attachments?.filter(
      (attachment) => attachment.status === "ready",
    ) || [];

  // Check if it's media-only message (images/videos only)
  const isMediaOnlyMessage =
    readyAttachments.length > 0 && !hasTextContent && !hasRichContent;
  const mediaAttachments = readyAttachments.filter(
    (a) => a.type.startsWith("image/") || a.type.startsWith("video/"),
  );
  const documentAttachments = readyAttachments.filter(
    (a) => !a.type.startsWith("image/") && !a.type.startsWith("video/"),
  );

  const handlePreviewAttachment = (
    attachment: Attachment,
    attachments?: Attachment[],
  ) => {
    if (onPreviewAttachment) {
      onPreviewAttachment(attachment, attachments);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-end mb-4",
        isOwnMessage ? "justify-end" : "justify-start",
        isActive && "z-10",
      )}
      ref={messageRef}
      onMouseEnter={() => shouldShowTrigger && setShowActions(true)}
      onMouseLeave={() => !isActive && setShowActions(false)}
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
        {/* Reply Preview */}
        {message.replyTo && (
          <div
            className={cn(
              "flex gap-2 mb-2",
              isOwnMessage ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "flex items-start gap-2 bg-muted/50 rounded-md p-2",
                isOwnMessage ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div className="w-1 bg-primary/50 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <Reply className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-primary">
                    {message.replyTo.senderId?.displayName || "Unknown"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {/* Handle rich content in reply preview */}
                  {message.replyTo.contentType === "rich" &&
                  message.replyTo.richContent ? (
                    <RichTextRenderer
                      content={message.replyTo.richContent}
                      compact
                      className="text-xs"
                    />
                  ) : (
                    <p>{message.replyTo.content}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={`flex ${
            isOwnMessage ? "flex-row-reverse" : ""
          } items-start gap-2`}
        >
          <div className="space-y-2">
            {/* Main Message Container */}
            <div
              className={cn(
                "relative rounded-2xl transition-colors overflow-hidden",
                isOwnMessage
                  ? "bg-chat-message-bg text-chat-message-fg rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none",
                isActive && "shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.2)]",
                // Remove padding for media-only messages
                isMediaOnlyMessage ? "p-0" : "p-1",
              )}
            >
              {mediaAttachments.length > 0 && (
                <div
                  className={cn(
                    // Remove border radius for embedded media
                    isMediaOnlyMessage
                      ? "rounded-2xl overflow-hidden"
                      : "mb-2 rounded-lg overflow-hidden",
                    isOwnMessage && isMediaOnlyMessage && "rounded-br-none",
                    !isOwnMessage && isMediaOnlyMessage && "rounded-bl-none",
                  )}
                >
                  <AttachmentDisplay
                    attachments={mediaAttachments}
                    isInMessage={true}
                    onPreview={(attachment) =>
                      handlePreviewAttachment(attachment, mediaAttachments)
                    }
                  />
                </div>
              )}

              {/* Text content - Enhanced with Rich Text Support */}
              {(hasTextContent || hasRichContent) && (
                <div className={cn(isMediaOnlyMessage ? "p-4 pt-2" : "p-2")}>
                  {hasRichContent ? (
                    <RichTextRenderer
                      content={message.richContent!}
                      className="message-rich-content"
                    />
                  ) : (
                    <p className="break-words whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </div>
              )}

              {/* Time stamp overlay for media-only messages */}
              {isMediaOnlyMessage && (
                <div
                  className={cn(
                    "absolute bottom-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white text-xs",
                    isOwnMessage ? "right-2" : "left-2",
                  )}
                >
                  <span>{formatTime(message.createdAt)}</span>
                  {isOwnMessage && <Check className="h-3 w-3" />}
                </div>
              )}
            </div>

            {documentAttachments.length > 0 && (
              <div
                className={cn("max-w-md", isOwnMessage && "flex justify-end")}
              >
                <AttachmentDisplay
                  attachments={documentAttachments}
                  isInMessage={true}
                  onPreview={(attachment) =>
                    handlePreviewAttachment(attachment, documentAttachments)
                  }
                />
              </div>
            )}

            {hasAttachments &&
              message.attachments?.some((a) => a.status !== "ready") && (
                <div className="text-xs text-muted-foreground italic">
                  {message.attachments?.filter((a) => a.status === "uploading")
                    .length > 0 && <span>Uploading files...</span>}
                  {message.attachments?.filter((a) => a.status === "failed")
                    .length > 0 && (
                    <span className="text-red-500">
                      Some files failed to upload
                    </span>
                  )}
                </div>
              )}
          </div>

          {/* Message Actions */}
          {showActions && (
            <div
              className={cn(
                "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isOwnMessage ? "order-1" : "order-2",
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleReply}
              >
                <Reply className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleReactionMenu}
              >
                <SmilePlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Time and status (only for non-media-only messages) */}
        {!isMediaOnlyMessage && (
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
            {/* Rich text indicator */}
            {hasRichContent && (
              <div className="ml-1 text-primary/60" title="Rich text message">
                <Type className="h-3 w-3" />
              </div>
            )}
          </div>
        )}

        {localReactions.length > 0 && (
          <MessageReactions
            messageId={message._id}
            reactions={localReactions}
            onReactionChange={handleReactionsChange}
            isOwnMessage={isOwnMessage}
          />
        )}
      </div>

      {/* Reaction menu */}
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
