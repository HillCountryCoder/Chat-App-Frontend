import { ReactNode } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import TopBar from "@/components/chat/TopBar";

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block w-64 border-r border-border h-full">
        <ChatSidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
