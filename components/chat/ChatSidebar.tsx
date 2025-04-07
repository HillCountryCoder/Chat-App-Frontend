// components/chat/ChatSidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { PlusCircle, Home, AtSign, Star, MessageSquare, Users, ChevronDown, ChevronRight } from "lucide-react";

export default function ChatSidebar() {
  const [shortcutsOpen, setShortcutsOpen] = useState(true);
  const [directMessagesOpen, setDirectMessagesOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const toggleShortcuts = () => setShortcutsOpen(!shortcutsOpen);
  const toggleDirectMessages = () => setDirectMessagesOpen(!directMessagesOpen);
  const toggleGroups = () => setGroupsOpen(!groupsOpen);

  // TODO: Replace with actual data from API
  const directMessages = [
    { id: "1", name: "Alice Hayden", hasUnread: true },
    { id: "2", name: "John Doe", hasUnread: false },
    { id: "3", name: "Jane Smith", hasUnread: false },
  ];

  const groups = [
    { id: "1", name: "Product Design Team", icon: "P" },
    { id: "2", name: "Developers", icon: "D" },
    { id: "3", name: "Graphics", icon: "G" },
  ];

  return (
    <div className="w-64 border-r border-border flex flex-col h-full bg-card">
      <div className="p-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => router.push("/chat/new")}
        >
          <PlusCircle size={18} />
          Create New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleShortcuts}
          >
            {shortcutsOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span className="text-sm font-medium">Shortcuts</span>
          </button>

          {shortcutsOpen && (
            <div className="ml-2">
              <Link
                href="/chat"
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                  pathname === "/chat" ? "bg-accent" : ""
                }`}
              >
                <Home size={18} />
                <span className="text-sm">Home</span>
              </Link>
              <Link
                href="/chat/mentions"
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                  pathname === "/chat/mentions" ? "bg-accent" : ""
                }`}
              >
                <AtSign size={18} />
                <span className="text-sm">Mentions</span>
              </Link>
              <Link
                href="/chat/starred"
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                  pathname === "/chat/starred" ? "bg-accent" : ""
                }`}
              >
                <Star size={18} />
                <span className="text-sm">Starred</span>
              </Link>
            </div>
          )}
        </div>

        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleDirectMessages}
          >
            {directMessagesOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span className="text-sm font-medium">Direct Messages</span>
          </button>

          {directMessagesOpen && (
            <div className="ml-2">
              {directMessages.map((dm) => (
                <Link
                  key={dm.id}
                  href={`/chat/dm/${dm.id}`}
                  className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                    pathname === `/chat/dm/${dm.id}` ? "bg-accent" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                    {dm.name.charAt(0)}
                  </div>
                  <span className="text-sm">{dm.name}</span>
                  {dm.hasUnread && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary"></div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mb-2">
          <button
            className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md"
            onClick={toggleGroups}
          >
            {groupsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="text-sm font-medium">Groups</span>
          </button>

          {groupsOpen && (
            <div className="ml-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/chat/group/${group.id}`}
                  className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent ${
                    pathname === `/chat/group/${group.id}` ? "bg-accent" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-xs">
                    {group.icon}
                  </div>
                  <span className="text-sm">{group.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
