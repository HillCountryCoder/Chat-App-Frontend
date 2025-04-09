"use client";

import { useRouter, usePathname } from "next/navigation";
import { useChannels } from "@/hooks/use-channels";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash, FolderClosed } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useUnreadCounts } from "@/hooks/use-unread";
import UnreadBadge from "./UnreadBadge";
import { ChannelType } from "@/types/chat";

export function ChannelList() {
  const { data: channels = [], isLoading, error } = useChannels();

  const { getChannelUnreadCount } = useUnreadCounts();

  const router = useRouter();
  const pathname = usePathname();

  const handleSelectChannel = (channelId: string) => {
    router.push(`/chat/channel/${channelId}`);
  };

  const handleCreateChannel = () => {
    router.push("/chat/new-channel");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Error loading channels. Please try again.
      </div>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <EmptyState
        title="No channels yet"
        description="Create a new channel to start collaborating with your team."
        icon={<FolderClosed size={48} />}
        action={{
          label: "Create a channel",
          onClick: handleCreateChannel,
        }}
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {channels.map((channel) => {
        const isActive = pathname === `/chat/channel/${channel._id}`;
        const unreadCount = getChannelUnreadCount(channel._id);

        return (
          <div
            key={channel._id}
            className={`p-4 hover:bg-accent cursor-pointer ${
              isActive ? "bg-accent" : ""
            }`}
            onClick={() => handleSelectChannel(channel._id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                <Hash className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium truncate flex items-center gap-2">
                    {channel.name}
                    {channel.type === ChannelType.ANNOUNCEMENT && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Announcement
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {!isActive && unreadCount > 0 && (
                      <UnreadBadge count={unreadCount} />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {channel.lastActivity
                        ? formatDistanceToNow(new Date(channel.lastActivity), {
                            addSuffix: true,
                          })
                        : ""}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {channel.description || `A ${channel.type} channel`}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
