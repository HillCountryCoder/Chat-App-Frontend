"use client";

import { useState } from "react";
import { useOnlineUsers } from "@/hooks/use-presence";
import { PresenceAwareAvatar } from "./PresenceAwareAvatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types/user";
import { useAuthStore } from "@/store/auth-store";

interface OnlineUsersListProps {
  limit?: number;
  showHeader?: boolean;
  collapsible?: boolean;
  className?: string;
  onUserClick?: (userId: string) => void;
  loadingUserId?: string | null;
}

export function OnlineUsersList({
  limit = 20,
  showHeader = true,
  collapsible = true,
  className,
  onUserClick,
  loadingUserId,
}: OnlineUsersListProps) {
  const { users, isLoading, refetch } = useOnlineUsers(limit);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user: currentUser } = useAuthStore();
  const filteredUsers = users.filter(
    (user) => user.userId !== currentUser?._id,
  );
  const totalOnline = filteredUsers.length;
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {showHeader && (
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}
        <div className="space-y-2 p-2">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
        </div>
      </div>
    );
  }
  const HeaderComponent = () => (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Online ({totalOnline})</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  const UserItem = ({ user }: { user: (typeof users)[0] }) => {
    const { data: userDetails } = useQuery({
      queryKey: ["user", user.userId],
      queryFn: async () => {
        const { data } = await api.get(`/users/${user.userId}`);
        return data as User;
      },
      staleTime: 300000, // 5 minutes
    });
    const isLoading = loadingUserId === user.userId;
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors",
          onUserClick && "cursor-pointer",
        )}
        onClick={() => !isLoading && onUserClick?.(user.userId)}
      >
        <PresenceAwareAvatar
          userId={user.userId}
          size="sm"
          fallback={(userDetails?.displayName || user.userId)
            .charAt(0)
            .toUpperCase()}
          presenceSize="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {userDetails?.displayName || user.userId}
          </div>
          {user.deviceInfo?.type && (
            <div className="text-xs text-muted-foreground">
              {user.deviceInfo.type}
            </div>
          )}
        </div>
        {isLoading && (
          <div className="ml-auto">
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  };
  return (
    <div className={cn("bg-card border rounded-lg", className)}>
      {showHeader && <HeaderComponent />}

      {!isCollapsed && (
        <ScrollArea className="max-h-80">
          <div className="p-2 space-y-1">
            {totalOnline === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-12 w-12 opacity-30" />
                  <div>
                    <p className="text-sm font-medium">No other users online</p>
                    <p className="text-xs opacity-70">
                      Other users will appear here when they come online
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserItem key={user.userId} user={user} />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Compact version for sidebars
export function OnlineUsersCount({ limit = 50 }: { limit?: number }) {
  const { users, isLoading } = useOnlineUsers(limit);
  const { user: currentUser } = useAuthStore(); // Get current user

  if (isLoading) {
    return <Skeleton className="h-4 w-16" />;
  }

  // Filter out current user and only count users with "online" status
  const actuallyOnlineUsers = users.filter(
    (user) => user.status === "online" && user.userId !== currentUser?._id,
  );

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span>{actuallyOnlineUsers.length} online</span>
    </div>
  );
}
