import { useState, useCallback, useEffect } from "react";
import type { Value } from "platejs";
import { Message } from "@/types/chat";
import { useAuthStore } from "@/store/auth-store";
import { initialEditorValue, valueToText } from "@/utils/rich-text";

// Edit time limit in milliseconds (24 hours)
const EDIT_TIME_LIMIT = 60 * 60 * 1000;

export function useMessageEditing() {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [editingRichContent, setEditingRichContent] =
    useState<Value>(initialEditorValue);
  const [editingMode, setEditingMode] = useState<"text" | "rich">("text");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [originalRichContent, setOriginalRichContent] =
    useState<Value>(initialEditorValue);
  const [originalMode, setOriginalMode] = useState<"text" | "rich">("text");

  const { user } = useAuthStore();

  const canEditMessage = useCallback(
    (message: Message): boolean => {
      if (!user || !message) return false;

      // Check if user is the sender
      const senderId =
        typeof message.senderId === "object"
          ? message.senderId._id
          : message.senderId;
      if (senderId !== user._id) return false;

      // Check if message is within edit time limit
      const messageTime = new Date(message.createdAt).getTime();
      const now = new Date().getTime();
      const timeDiff = now - messageTime;

      return timeDiff <= EDIT_TIME_LIMIT;
    },
    [user],
  );

  const getTimeRemaining = useCallback((message: Message): number => {
    const messageTime = new Date(message.createdAt).getTime();
    const now = new Date().getTime();
    const timeDiff = now - messageTime;
    const remaining = EDIT_TIME_LIMIT - timeDiff;

    return Math.max(0, remaining);
  }, []);

  const formatTimeRemaining = useCallback((timeMs: number): string => {
    const hours = Math.floor(timeMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining to edit`;
    }
    return `${minutes}m remaining to edit`;
  }, []);

  const startEditing = useCallback(
    (message: Message) => {
      if (!canEditMessage(message)) return;

      setEditingMessageId(message._id);

      // Determine the mode based on message content type
      const isRichMode = message.contentType === "rich" && message.richContent;
      setEditingMode(isRichMode ? "rich" : "text");
      setOriginalMode(isRichMode ? "rich" : "text");

      if (isRichMode) {
        setEditingRichContent(message.richContent || initialEditorValue);
        setOriginalRichContent(message.richContent || initialEditorValue);
        setEditingContent(
          valueToText(message.richContent || initialEditorValue),
        );
        setOriginalContent(
          valueToText(message.richContent || initialEditorValue),
        );
      } else {
        setEditingContent(message.content);
        setOriginalContent(message.content);
        setEditingRichContent(initialEditorValue);
        setOriginalRichContent(initialEditorValue);
      }
    },
    [canEditMessage],
  );

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent("");
    setEditingRichContent(initialEditorValue);
    setEditingMode("text");
    setOriginalContent("");
    setOriginalRichContent(initialEditorValue);
    setOriginalMode("text");
  }, []);

  const hasChanges = useCallback((): boolean => {
    if (editingMode === "rich") {
      return (
        JSON.stringify(editingRichContent) !==
        JSON.stringify(originalRichContent)
      );
    } else {
      return editingContent.trim() !== originalContent.trim();
    }
  }, [
    editingMode,
    editingContent,
    editingRichContent,
    originalContent,
    originalRichContent,
  ]);

  const toggleEditingMode = useCallback(() => {
    if (editingMode === "text") {
      // Convert text to rich content
      setEditingRichContent([
        {
          type: "paragraph",
          children: [{ text: editingContent }],
        },
      ]);
      setEditingMode("rich");
    } else {
      // Convert rich content to text
      setEditingContent(valueToText(editingRichContent));
      setEditingMode("text");
    }
  }, [editingMode, editingContent, editingRichContent]);

  // Auto-cancel editing if time limit expires
  useEffect(() => {
    if (!editingMessageId) return;

    const interval = setInterval(() => {
      // This will be handled by the component to check if edit time expired
    }, 1000);

    return () => clearInterval(interval);
  }, [editingMessageId]);

  return {
    // State
    editingMessageId,
    editingContent,
    editingRichContent,
    editingMode,

    // Actions
    startEditing,
    cancelEditing,
    setEditingContent,
    setEditingRichContent,
    toggleEditingMode,

    // Helpers
    canEditMessage,
    hasChanges,
    getTimeRemaining,
    formatTimeRemaining,

    // Constants
    EDIT_TIME_LIMIT,
  };
}
