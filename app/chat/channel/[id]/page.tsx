"use client";

import { useParams } from "next/navigation";
import { useChannel } from "@/hooks/use-channels";
import { Skeleton } from "@/components/ui/skeleton";
import ChannelWindow from "@/components/chat/ChannelWindow";

export default function ChannelPage() {
  const { id } = useParams();

  const {
    data: channel,
    isLoading: channelLoading,
    error: channelError,
  } = useChannel(id as string);

  if (channelLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (channelError || !channel) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8 text-destructive">
          <p>Channel not found or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChannelWindow channelId={channel._id} />
    </div>
  );
}
