// src/hooks/use-message-reactions.ts
import { useState, useCallback, useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import { Reaction } from "@/types/chat";

interface UseMessageReactionsOptions {
  messageId: string;
  initialReactions?: Reaction[];
}

export function useMessageReactions({
  messageId,
  initialReactions = [],
}: UseMessageReactionsOptions) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const { socket } = useSocket();
  const { user } = useAuthStore();

  // Check if user has reacted with a specific emoji
  const hasUserReacted = useCallback(
    (emoji: string) => {
      if (!user) return false;

      const reaction = reactions.find((r) => r.emoji === emoji);
      return reaction ? reaction.users.includes(user._id) : false;
    },
    [reactions, user],
  );

  // Toggle reaction (add or remove)
  const toggleReaction = useCallback(
    (emoji: string) => {
      if (!socket || !user) return;

      if (hasUserReacted(emoji)) {
        // User already reacted, so remove reaction
        socket.emit(
          "remove_reaction",
          { messageId, emoji },
          (response: { success: boolean; reactions: Reaction[] }) => {
            if (response.success) {
              setReactions(response.reactions);
            }
          },
        );
      } else {
        // User hasn't reacted, so add reaction
        socket.emit(
          "add_reaction",
          { messageId, emoji },
          (response: { success: boolean; reactions: Reaction[] }) => {
            if (response.success) {
              setReactions(response.reactions);
            }
          },
        );
      }
    },
    [socket, messageId, user, hasUserReacted],
  );

  // Format user names for tooltip
  const formatReactionUsers = useCallback(
    (emoji: string) => {
      if (!user) return "";

      const reaction = reactions.find((r) => r.emoji === emoji);
      if (!reaction) return "";

      // In a real implementation, you would fetch user details for all IDs
      // For now, we'll just replace the current user's ID with "You"
      return reaction.users
        .map((userId) => (userId === user._id ? "You" : userId))
        .join(", ");
    },
    [reactions, user],
  );

  // Listen for reaction updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      if (data.messageId === messageId) {
        setReactions(data.reactions);
      }
    };

    socket.on("message_reaction_updated", handleReactionUpdate);

    return () => {
      socket.off("message_reaction_updated", handleReactionUpdate);
    };
  }, [socket, messageId]);

  // Fetch reactions on mount (if not provided)
  useEffect(() => {
    if (!messageId || initialReactions.length > 0) return;

    const fetchReactions = async () => {
      try {
        const { data } = await api.get(`/messages/${messageId}/reactions`);
        setReactions(data);
      } catch (error) {
        console.error("Failed to fetch reactions:", error);
      }
    };

    fetchReactions();
  }, [messageId, initialReactions]);

  return {
    reactions,
    toggleReaction,
    hasUserReacted,
    formatReactionUsers,
  };
}
