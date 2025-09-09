// components/NavUser.tsx
"use client";

import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useUnreadCounts } from "@/hooks/use-unread";
import UnreadBadge from "./chat/UnreadBadge";
import { PresenceAwareAvatar } from "@/components/presence/PresenceAwareAvatar";
import { StatusSelector } from "@/components/presence/StatusSelector";

export function NavUser() {
  const { user } = useAuthStore();
  const router = useRouter();
  const logout = useLogout();
  const { getTotalUnreadCount } = useUnreadCounts();

  const totalUnread = getTotalUnreadCount();

  const handleLogout = async () => {
    await logout.mutateAsync({});
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="cursor-pointer">
          <button className="relative outline-none focus:ring-2 focus:ring-primary/50 rounded-full">
            <PresenceAwareAvatar
              userId={user?._id || ""}
              src={user?.avatarUrl}
              alt={user?.displayName || ""}
              fallback={
                user?.displayName?.charAt(0) || user?.username?.charAt(0) || "?"
              }
              size="md"
              showPresence={true}
            />

            {totalUnread > 0 && (
              <div className="absolute -top-1 -right-1">
                <UnreadBadge count={totalUnread} maxCount={99} />
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            <PresenceAwareAvatar
              userId={user?._id || ""}
              src={user?.avatarUrl || ""}
              alt={user?.displayName || ""}
              fallback={
                user?.displayName?.charAt(0) || user?.username?.charAt(0) || "?"
              }
              size="sm"
              showPresence={true}
              presenceSize="sm"
            />
            <div className="flex flex-col">
              <div className="font-medium">{user?.displayName}</div>
              <div className="text-xs text-muted-foreground">
                @{user?.username}
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Status Selector */}
          <div className="p-2">
            <StatusSelector variant="default" className="w-full" />
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push("/chat/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
