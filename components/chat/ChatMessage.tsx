import { Fragment, useRef, useState } from "react";
import { Message, Reaction } from "@/types/chat";
import { Attachment } from "@/types/attachment";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Check,
  Loader2,
  MoreVertical,
  Reply,
  SmilePlus,
  Type,
} from "lucide-react";
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
import { Edit, Clock } from "lucide-react";
import { useMessageEditing } from "@/hooks/use-message-editing";
import { useEditMessage } from "@/hooks/use-chat";
import RichTextEditor from "./RichTextEditor";
import { hasContent } from "@/utils/rich-text";

interface ChatMessageProps {
  message: Message & {
    richContent?: Value;
    contentType?: "text" | "rich" | "image" | "file" | "code" | "system";
  };
  recipient?: User;
  onReply?: (message: Message) => void;
  onPreviewAttachment?: (
    attachment: Attachment,
    attachments?: Attachment[]
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

  const {
    editingMessageId,
    editingContent,
    editingRichContent,
    editingMode,
    startEditing,
    cancelEditing,
    setEditingContent,
    setEditingRichContent,
    toggleEditingMode,
    canEditMessage,
    hasChanges,
    getTimeRemaining,
    formatTimeRemaining,
  } = useMessageEditing();

  const editMessageMutation = useEditMessage();
  const [, setIsEditingSameMessage] = useState(false);
  const isEditing = editingMessageId === message._id;
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
        }
      );
    } else {
      socket.emit(
        "add_reaction",
        { messageId: message._id, emoji },
        (response: ReactionResponse) => {
          if (response.success) {
            setLocalReactions(response.reactions);
          }
        }
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

  const readyAttachments =
    message.attachments?.filter(
      (attachment) => attachment.status === "ready"
    ) || [];

  const handlePreviewAttachment = (
    attachment: Attachment,
    attachments?: Attachment[]
  ) => {
    if (onPreviewAttachment) {
      onPreviewAttachment(attachment, attachments);
    }
  };

  const handleEditMessage = () => {
    if (canEditMessage(message)) {
      startEditing(message);
      setIsEditingSameMessage(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!hasChanges()) {
      cancelEditing();
      return;
    }

    const content =
      editingMode === "rich"
        ? editingContent.trim() || "📎"
        : editingContent.trim();

    if (!content && editingMode === "text") return;
    if (editingMode === "rich" && !hasContent(editingRichContent)) return;
    const previousMessages = editMessageMutation.getPreviousMessages({
      directMessageId: message.directMessageId,
    });
    try {
      editMessageMutation.setMessages(
        message,
        editingMode,
        content,
        editingRichContent
      );
      cancelEditing();
      setIsEditingSameMessage(false);
      await editMessageMutation.mutateAsync({
        messageId: message._id,
        content,
        richContent: editingMode === "rich" ? editingRichContent : undefined,
        contentType: editingMode === "rich" ? "rich" : "text",
        directMessageId: message.directMessageId,
        channelId: message.channelId,
      });
    } catch (error) {
      console.error("Failed to save edit:", error);
      // Revert to previous messages on error
      if (previousMessages) {
        editMessageMutation.setQueryData(
          ["messages", "direct", message.directMessageId],
          previousMessages
        );
      }

      startEditing(message);
    }
  };

  const handleCancelEdit = () => {
    cancelEditing();
    setIsEditingSameMessage(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancelEdit();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-end mb-4",
        isOwnMessage ? "justify-end" : "justify-start",
        isActive && "z-10"
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
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {/* Reply Preview */}
        {message.replyTo && (
          <div
            className={cn(
              "flex gap-2 mb-2",
              isOwnMessage ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "flex items-start gap-2 bg-muted/50 rounded-md p-2",
                isOwnMessage ? "flex-row-reverse" : "flex-row"
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
          <Fragment key={message._id}>
            {/* Main Message Container */}
            <div
              className={cn(
                "relative rounded-2xl transition-colors overflow-hidden",
                isOwnMessage
                  ? `bg-chat-message-bg text-chat-message-fg rounded-br-none`
                  : "bg-muted text-foreground rounded-bl-none",
                isActive && "shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.2)]",
                // Always add padding - remove the conditional padding
                "p-3"
              )}
            >
              {/* Media attachments - INSIDE the message bubble */}
              {readyAttachments.length > 0 && (
                <div
                  className={cn(
                    (hasTextContent || hasRichContent) && "mb-3 rounded-lg"
                  )}
                >
                  <AttachmentDisplay
                    attachments={readyAttachments}
                    isInMessage={true}
                    compact={true}
                    isOwnMessage={isOwnMessage}
                    onPreview={(attachment) =>
                      handlePreviewAttachment(attachment, readyAttachments)
                    }
                  />
                </div>
              )}

              {/* Text content */}
              {(hasTextContent || hasRichContent) && (
                <div>
                  {isEditing ? (
                    <div className="space-y-2" onKeyDown={handleKeyDown}>
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          variant={editingMode === "text" ? "default" : "ghost"}
                          size="sm"
                          onClick={() =>
                            editingMode === "rich" && toggleEditingMode()
                          }
                          disabled={editingMode === "text"}
                        >
                          Text
                        </Button>
                        <Button
                          variant={editingMode === "rich" ? "default" : "ghost"}
                          size="sm"
                          onClick={() =>
                            editingMode === "text" && toggleEditingMode()
                          }
                          disabled={editingMode === "rich"}
                        >
                          <Type className="h-4 w-4 mr-1" />
                          Rich
                        </Button>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRemaining(getTimeRemaining(message))}
                        </div>
                      </div>

                      {editingMode === "rich" ? (
                        <RichTextEditor
                          value={editingRichContent}
                          onChange={setEditingRichContent}
                          placeholder="Edit your message..."
                          autoFocus
                          minHeight={60}
                          maxHeight={200}
                          submitOnEnter={false}
                          className="border border-primary/20 text-black"
                        />
                      ) : (
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          placeholder="Edit your message..."
                          autoFocus
                          className="w-full min-h-[60px] max-h-[200px] p-2 border border-primary/20 rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ resize: "none" }}
                        />
                      )}

                      <div className="text-xs text-muted-foreground">
                        Press Ctrl+Enter to save, Escape to cancel
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}

              {/* Time stamp and status - INSIDE message bubble for all messages */}
              <div
                className={cn(
                  "flex items-center justify-between mt-2 pt-1",
                  // Add top border if there's content above
                  (hasTextContent ||
                    hasRichContent ||
                    readyAttachments.length > 0) &&
                    "border-t border-black/10"
                )}
              >
                <div className="flex items-center gap-1 text-xs opacity-70">
                  <span>{formatTime(message.createdAt)}</span>
                  {message.isEdited && (
                    <span className="text-muted-foreground">(edited)</span>
                  )}
                  {hasRichContent && (
                    <div className="text-primary/60" title="Rich text message">
                      <Type className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {isOwnMessage && (
                  <div className="flex items-center">
                    <Check className="h-3 w-3 opacity-70" />
                  </div>
                )}
              </div>
            </div>

            {/* Remove the separate document attachments section - they're now inside the message */}
            {/* Remove the separate time/status section - it's now inside the message */}
          </Fragment>

          {/* Message Actions */}
          {(showActions || isEditing) && (
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity",
                showActions || isEditing
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
                isOwnMessage ? "order-1" : "order-2"
              )}
            >
              {!isEditing && (
                <>
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
                  {canEditMessage(message) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleEditMessage}
                      title={formatTimeRemaining(getTimeRemaining(message))}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </>
              )}

              {isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={editMessageMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!hasChanges() || editMessageMutation.isPending}
                  >
                    {editMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

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
            isOwnMessage ? "right-0" : "left-10"
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
