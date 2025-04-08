// app/(main)/chat/page.tsx
"use client";

import { useAuthStore } from "@/store/auth-store";
import DirectMessageList from "@/components/chat/DirectMessageList";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function ChatHomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  if (!isAuthenticated || !user) {
    return null; // Will be redirected by middleware
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Messages</h1>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => router.push("/chat/new")}
          >
            <Plus className="h-4 w-4" />
		New Chat
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DirectMessageList />
      </div>
    </div>
  );
}
