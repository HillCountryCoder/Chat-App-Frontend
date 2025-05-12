import React, { useState, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { useSocket } from "@/providers/socket-provider";
import { useAuthStore } from "@/store/auth-store";
import EmojiPicker from "emoji-picker-react";
import { Reaction } from "@/types/chat";

const QuickReactions = ["👍", "❤️", "😂", "😢", "🙏", "👎", "😡"];

interface MessageReactionMenuProps {
  messageId: string;
  onReactionSelect: (emoji: string) => void;
}

export default function MessageReactionMenu({
  messageId,
  onReactionSelect,
}: MessageReactionMenuProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleQuickReaction = (emoji: string) => {
    if (!socket || !user) return;

    // Log for debugging
    console.log("Emitting add_reaction from MessageReactionMenu", {
      messageId,
      emoji,
    });

    socket.emit(
      "add_reaction",
      { messageId, emoji },
      (response: { success: boolean; reactions: Reaction[] }) => {
        console.log("Reaction response:", response);
        if (response.success) {
          onReactionSelect(emoji);
        }
      },
    );
  };

  const handleSelectEmoji = (emojiData: { emoji: string }) => {
    onReactionSelect(emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div
      className="bg-background/90 backdrop-blur-sm border border-border rounded-full p-1 shadow-md flex items-center gap-1"
      data-reaction-menu="true"
    >
      {QuickReactions.map((emoji) => (
        <button
          key={emoji}
          className="hover:bg-accent rounded-full w-8 h-8 flex items-center justify-center text-lg transition-colors"
          onClick={() => handleQuickReaction(emoji)}
        >
          {emoji}
        </button>
      ))}

      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <button
            className="hover:bg-accent rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            onClick={() => setShowPicker(true)}
          >
            <Plus size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 border-none shadow-lg"
          ref={pickerRef}
          data-reaction-menu="true"
        >
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
