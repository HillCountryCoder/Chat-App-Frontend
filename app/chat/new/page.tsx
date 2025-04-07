// app/(main)/chat/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUsers, useSendMessage } from "@/hooks/use-chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Loader2 } from "lucide-react";
import { debounce } from "lodash";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@/types/user";

export default function NewChatPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser } = useAuthStore();
  const router = useRouter();

  const { data: users = [], isLoading, error } = useUsers(searchQuery);

  const sendMessage = useSendMessage();

  // Filter out current user
  const filteredUsers = users.filter((u: User) => u._id !== currentUser?._id);

  const handleSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  const startConversation = async (recipientId: string) => {
    try {
      const response = await sendMessage.mutateAsync({
        receiverId: recipientId,
        content: "👋 Hi there!", // Initial message
      });

      // Navigate to the new conversation
      router.push(`/chat/dm/${response.directMessage._id}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Start a New Conversation</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-10"
          placeholder="Search for users by name or username"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center p-8 text-destructive">
          Error loading users. Please try again.
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="space-y-1">
          {filteredUsers.map((user: User) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={user.avatarUrl || ""}
                    alt={user.displayName || ""}
                  />
                  <AvatarFallback>
                    {user.displayName?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{user.displayName}</h3>
                  <p className="text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={() => startConversation(user._id)}
                disabled={sendMessage.isPending}
              >
                {sendMessage.isPending &&
                sendMessage.variables?.receiverId === user._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare size={16} />
                )}
                Message
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
