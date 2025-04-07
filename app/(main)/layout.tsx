import { ReactNode } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import TopBar from "@/components/chat/TopBar";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
