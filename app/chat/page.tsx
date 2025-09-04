// Fixed page.tsx - Let ChatDashboard handle authentication
"use client";

import ChatDashboard from "@/components/chat/ChatDashboard";
import { useAuthPersistence } from "@/hooks/use-auth-persistence";

export default function ChatHomePage() {
  // Just ensure auth persistence is running
  const { hasHydrated } = useAuthPersistence();

  // Always render ChatDashboard - it will handle auth state internally
  if (!hasHydrated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <ChatDashboard />;
}
