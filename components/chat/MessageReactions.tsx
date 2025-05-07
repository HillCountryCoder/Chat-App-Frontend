import React, { useState, useRef, useEffect, memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { useSocket } from "@/providers/socket-provider";
import { useAuthStore } from "@/store/auth-store";
import EmojiPicker from "emoji-picker-react";
import { cn } from "@/lib/utils";

// Type for reaction prop
interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReactionChange?: (messageId: string, reactions: Reaction[]) => void;
}

function MessageReactions({
  messageId,
  reactions = [],
  onReactionChange,
}: MessageReactionsProps) {
  console.log(
    `Rendering MessageReactions for ${messageId} with ${reactions.length} reactions`,
  );
  const [showPicker, setShowPicker] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Track if user has reacted with each emoji
  const hasUserReacted = (reaction: Reaction) => {
    return reaction.users.some((userId) => userId === user?._id);
  };

  // Handle clicking on an existing reaction
  const handleReactionClick = (emoji: string) => {
    if (!socket || !user) return;

    const reaction = reactions.find((r) => r.emoji === emoji);

    if (reaction && hasUserReacted(reaction)) {
      // User already reacted, so remove reaction
      socket.emit(
        "remove_reaction",
        { messageId, emoji },
        (response: { success: boolean; reactions: Reaction[] }) => {
          if (response.success && onReactionChange) {
            onReactionChange(messageId, response.reactions);
          }
        },
      );
    } else {
      // User hasn't reacted, so add reaction
      socket.emit(
        "add_reaction",
        { messageId, emoji },
        (response: { success: boolean; reactions: Reaction[] }) => {
          if (response.success && onReactionChange) {
            onReactionChange(messageId, response.reactions);
          }
        },
      );
    }
  };

  // Handle selecting an emoji from the picker
  const handleSelectEmoji = (emojiData: { emoji: string }) => {
    handleReactionClick(emojiData.emoji);
    setShowPicker(false);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Listen for reaction updates from socket
  useEffect(() => {
    if (!socket) return;

    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      console.log("Received reaction update in MessageReactions", data);
      if (data.messageId === messageId && onReactionChange) {
        onReactionChange(messageId, data.reactions);
      }
    };

    socket.on("message_reaction_updated", handleReactionUpdate);

    return () => {
      socket.off("message_reaction_updated", handleReactionUpdate);
    };
  }, [socket, messageId, onReactionChange]);

  // Format user names for tooltip
  const formatUserNames = (reaction: Reaction) => {
    // Note: In a real implementation, you would fetch user details by IDs
    // and display actual names instead of IDs
    return reaction.users
      .map((userId) => (userId === user?._id ? "You" : userId))
      .join(", ");
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {reactions.map((reaction) => (
        <TooltipProvider key={reaction.emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleReactionClick(reaction.emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted",
                  hasUserReacted(reaction) && "bg-primary/20",
                )}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatUserNames(reaction)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <button
            className="p-1 rounded-full bg-muted hover:bg-muted/80"
            onClick={() => setShowPicker(true)}
          >
            <Plus size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 border-none shadow-lg" ref={popoverRef}>
          <EmojiPicker
            onEmojiClick={handleSelectEmoji}
            searchDisabled
            skinTonesDisabled
            width={300}
            height={400}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
export default memo(MessageReactions, (prevProps, nextProps) => {
  // Only re-render if the reactions array has actually changed in content
  if (prevProps.messageId !== nextProps.messageId) return false;

  if (prevProps.reactions.length !== nextProps.reactions.length) return false;

  // Compare the reactions more deeply
  const prevReactions = JSON.stringify(prevProps.reactions);
  const nextReactions = JSON.stringify(nextProps.reactions);

  return prevReactions === nextReactions;
});
