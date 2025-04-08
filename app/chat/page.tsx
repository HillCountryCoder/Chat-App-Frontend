"use client";

import { useAuthStore } from "@/store/auth-store";
import ChatDashboard from "@/components/chat/ChatDashboard";

export default function ChatHomePage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null; // Will be redirected by middleware
  }

  return <ChatDashboard />;
}
