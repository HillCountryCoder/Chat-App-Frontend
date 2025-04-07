"use client";

import { useParams } from "next/navigation";
import { useDirectMessage, useRecipient } from "@/hooks/use-chat";
import { useAuthStore } from "@/store/auth-store";
import ChatWindow from "@/components/chat/ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";

export default function DirectMessagePage() {
  const { id } = useParams();
  const { user } = useAuthStore();

  const {
    data: directMessage,
    isLoading: dmLoading,
    error: dmError,
  } = useDirectMessage(id as string);

  // Find other participant's ID
  const recipientId = directMessage?.participantIds?.find(
    (pid) => pid !== user?._id,
  );

  if (dmLoading) {
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

  if (dmError || !directMessage) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8 text-destructive">
          <p>Conversation not found or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChatWindow
        directMessageId={directMessage._id}
        recipientId={recipientId}
      />
    </div>
  );
}
