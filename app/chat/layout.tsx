// app/(main)/chat/layout.tsx
import { ReactNode } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import TopBar from "@/components/chat/TopBar";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - hidden on mobile, shown on larger screens */}
      <div className="hidden md:block w-64 border-r border-border h-full">
        <ChatSidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
