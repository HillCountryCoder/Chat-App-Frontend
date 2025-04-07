"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Settings } from "lucide-react";
import { ModeToggle } from "../theme-toggle";
import { NavUser } from "../NavUser";
import { UserActivityStatus } from "./UserActvityStatus";

export default function TopBar() {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4">
      <div className="w-1/2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            className="pl-8 w-full bg-muted rounded-full h-9"
            placeholder="Search Conversation"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-4">
          <ModeToggle />
          <UserActivityStatus />
          <NavUser />
          <button>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
