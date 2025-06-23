import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMessages, useSendMessage, useRecipient } from "@/hooks/use-chat";
import { useSocket } from "@/providers/socket-provider";
import { Message, Reaction } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from "./ChatMessage";
import MessageDate from "./MessageDate";
import FileUploadDropzone from "./FileUploadDropzone";
import AttachmentPreview from "./AttachmentPreview";
import MediaViewer from "./MediaViewer";
import {
  Phone,
  Video,
  Paperclip,
  Send,
  Loader2,
  Reply,
  X,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { useMarkAsRead } from "@/hooks/use-unread";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  useAttachmentPreview,
  useAttachmentStatusUpdates,
} from "@/hooks/use-attachments";
import { Attachment } from "@/types/attachment";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { markDirectMessageAsRead } = useMarkAsRead();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [previewAttachments, setPreviewAttachments] = useState<Attachment[]>(
    [],
  );

  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useMessages(undefined, directMessageId);

  const { data: recipient, isLoading: recipientLoading } =
    useRecipient(recipientId);

  const sendMessageMutation = useSendMessage();

  // 🔥 IMPROVED: File upload hook with better error handling
  const {
    pendingFiles,
    uploadedAttachments,
    isUploading,
    addFiles,
    removeFile,
    removeAttachment,
    removeFailedFiles,
    clearAll,
    retryFailedUploads,
    retrySpecificFile,
    getAttachmentIds,
    isReadyToSend,
    hasFailedUploads,
    hasCompletedUploads,
    getTotalCount,
    canAddMoreFiles,
    updateAttachmentStatus,
    getFileCounts,
    hasOnlyFailedFiles,
  } = useFileUpload({
    autoUpload: true,
    onSuccess: (attachments) => {
      console.log("Files uploaded successfully:", attachments);
    },
    onError: (error) => {
      console.error("Upload error:", error);
    },
  });

  // Media viewer hook
  const {
    currentAttachment,
    isOpen: isViewerOpen,
    openPreview,
    closePreview,
  } = useAttachmentPreview();

  const currentAttachmentIds = useMemo(() => {
    return uploadedAttachments.map((a) => a._id);
  }, [uploadedAttachments]);

  const { statusUpdates } = useAttachmentStatusUpdates(currentAttachmentIds);

  useEffect(() => {
    Object.entries(statusUpdates).forEach(([attachmentId, update]) => {
      const currentAttachment = uploadedAttachments.find(
        (a) => a._id === attachmentId,
      );

      if (currentAttachment && currentAttachment.status !== update.status) {
        console.log(
          `Updating attachment ${attachmentId} status from ${currentAttachment.status} to ${update.status}`,
        );
        updateAttachmentStatus(attachmentId, update.status, update.metadata);
      }
    });
  }, [statusUpdates, uploadedAttachments, updateAttachmentStatus]);

  useEffect(() => {
    if (!socket || !directMessageId) return;

    socket.emit("join_direct_message", { directMessageId });

    return () => {
      socket.emit("leave_direct_message", { directMessageId });
    };
  }, [socket, directMessageId]);

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
          queryClient.invalidateQueries({
            queryKey: ["messages", "direct", directMessageId],
          });

          markDirectMessageAsRead.mutate(directMessageId);
        }
      };

      socket.on("new_direct_message", handleNewMessage);

      return () => {
        socket.off("new_direct_message", handleNewMessage);
      };
    }
  }, [socket, directMessageId, queryClient, markDirectMessageAsRead]);

  // Listen for reaction updates
  useEffect(() => {
    if (!socket) return;

    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      console.log("Received reaction update in ChatWindow", data);

      setMessageReactions((prev) => {
        const newState = { ...prev };
        newState[data.messageId] = [...data.reactions];
        return newState;
      });
    };

    socket.on("message_reaction_updated", handleReactionUpdate);

    return () => {
      socket.off("message_reaction_updated", handleReactionUpdate);
    };
  }, [socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messageReactions]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() && getAttachmentIds().length === 0) return;

    // 🔥 IMPROVED: Can send even with failed files (they'll be excluded)
    if (!isReadyToSend()) return;

    sendMessageMutation.mutate(
      {
        content: newMessage.trim() || "📎",
        directMessageId,
        replyToId: replyingTo?._id,
        attachmentIds: getAttachmentIds(),
      },
      {
        onSuccess: () => {
          setNewMessage("");
          setReplyingTo(null);
          clearAll();
        },
        onError: (error) => {
          console.error("Failed to send message:", error);
        },
      },
    );
  };

  const handleFileUpload = (files: File[]) => {
    addFiles(files);
    setShowFileUpload(false);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handlePreviewAttachment = (
    attachment: Attachment,
    attachments?: Attachment[],
  ) => {
    setPreviewAttachments(attachments || [attachment]);
    openPreview(attachment);
  };

  // Check if two dates are the same day
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fileCounts = getFileCounts();
  const canSendMessage =
    (newMessage.trim() ||
      hasCompletedUploads ||
      uploadedAttachments.length > 0) &&
    isReadyToSend() &&
    !sendMessageMutation.isPending;

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
            {[...messages].reverse().map((message, index, reversedArray) => {
              const showDateSeparator =
                index === 0 ||
                !areSameDay(
                  reversedArray[index - 1].createdAt,
                  message.createdAt,
                );

              const reactions =
                messageReactions[message._id] || message.reactions || [];

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
                    onReply={handleReply}
                    onPreviewAttachment={handlePreviewAttachment}
                  />
                </Fragment>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Dropzone */}
      {showFileUpload && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-8">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Upload Files</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFileUpload(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FileUploadDropzone
              onFilesSelected={handleFileUpload}
              currentFileCount={getTotalCount()}
              disabled={!canAddMoreFiles}
            />
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="border-t border-border">
        {/* 🔥 IMPROVED: Failed Files Warning */}
        {hasFailedUploads && hasOnlyFailedFiles && (
          <div className="p-4 pb-0">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                All files failed to upload. Remove failed files or retry
                uploading to send your message.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Attachment Preview */}
        {(pendingFiles.length > 0 || uploadedAttachments.length > 0) && (
          <div className="p-4 border-b border-border">
            <AttachmentPreview
              pendingFiles={pendingFiles}
              uploadedAttachments={uploadedAttachments}
              onRemoveFile={removeFile}
              onRemoveAttachment={removeAttachment}
              onRetryFailed={hasFailedUploads ? retryFailedUploads : undefined}
              onRetrySpecificFile={retrySpecificFile}
              onRemoveFailedFiles={
                hasFailedUploads ? removeFailedFiles : undefined
              }
            />
          </div>
        )}

        {/* Reply Preview */}
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
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {replyingTo.content}
                  </p>
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

        {/* Message Input */}
        <div className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowFileUpload(true)}
              disabled={!canAddMoreFiles}
              title={canAddMoreFiles ? "Attach files" : "Maximum files reached"}
            >
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
              type="submit"
              size="icon"
              disabled={!canSendMessage}
              className={cn(isUploading && "animate-pulse")}
              title={
                hasOnlyFailedFiles
                  ? "Remove failed files to send message"
                  : canSendMessage
                  ? "Send message"
                  : "Add content or files to send"
              }
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isUploading ? (
                <Upload className="h-4 w-4" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Media Viewer */}
      <MediaViewer
        attachment={currentAttachment}
        attachments={previewAttachments}
        isOpen={isViewerOpen}
        onClose={() => {
          closePreview();
          setPreviewAttachments([]);
        }}
        onNext={() => {
          const currentIndex = previewAttachments.findIndex(
            (a) => a._id === currentAttachment?._id,
          );
          if (currentIndex < previewAttachments.length - 1) {
            openPreview(previewAttachments[currentIndex + 1]);
          }
        }}
        onPrevious={() => {
          const currentIndex = previewAttachments.findIndex(
            (a) => a._id === currentAttachment?._id,
          );
          if (currentIndex > 0) {
            openPreview(previewAttachments[currentIndex - 1]);
          }
        }}
      />
    </div>
  );
}
