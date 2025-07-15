"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyPresence } from "@/hooks/use-presence";
import { PRESENCE_STATUS } from "@/types/presence";
import { StatusDot } from "./PresenceIndicator";
import { cn } from "@/lib/utils";

interface StatusOption {
  status: PRESENCE_STATUS;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

const statusOptions: StatusOption[] = [
  {
    status: PRESENCE_STATUS.ONLINE,
    label: "Online",
    description: "Available for chat",
  },
  {
    status: PRESENCE_STATUS.AWAY,
    label: "Away",
    description: "Not at desk",
  },
  {
    status: PRESENCE_STATUS.BUSY,
    label: "Busy",
    description: "Do not disturb",
  },
];

interface StatusSelectorProps {
  variant?: "default" | "compact" | "minimal";
  className?: string;
  showLabel?: boolean;
}

export function StatusSelector({
  variant = "default",
  className,
  showLabel = true,
}: StatusSelectorProps) {
  const { currentStatus, changeStatus, isChangingStatus, isConnected } =
    useMyPresence();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = statusOptions.find(
    (option) => option.status === currentStatus,
  );

  const handleStatusChange = (status: PRESENCE_STATUS) => {
    changeStatus(status);
    setIsOpen(false);
  };

  // Minimal variant - just the dot
  if (variant === "minimal") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-auto p-1", className)}
            disabled={isChangingStatus || !isConnected}
          >
            <StatusDot status={currentStatus} size="md" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.status}
              onClick={() => handleStatusChange(option.status)}
              className="flex items-center gap-3 py-2"
            >
              <StatusDot status={option.status} size="md" />
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
              {currentStatus === option.status && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Compact variant - dot + status text
  if (variant === "compact") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-auto py-1 px-2 gap-2", className)}
            disabled={isChangingStatus || !isConnected}
          >
            <StatusDot status={currentStatus} size="sm" />
            {showLabel && (
              <span className="text-xs">
                {currentOption?.label || "Offline"}
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.status}
              onClick={() => handleStatusChange(option.status)}
              className="flex items-center gap-3 py-2"
            >
              <StatusDot status={option.status} size="md" />
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
              {currentStatus === option.status && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant - full status indicator
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto py-2 px-3 gap-2 justify-start",
            "hover:bg-accent/50 transition-colors",
            isChangingStatus && "opacity-50",
            className,
          )}
          disabled={isChangingStatus || !isConnected}
        >
          <StatusDot status={currentStatus} size="md" />
          <div className="flex flex-col items-start">
            {showLabel && (
              <span className="text-sm font-medium">
                {currentOption?.label || "Offline"}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {isChangingStatus
                ? "Updating..."
                : !isConnected
                ? "Connecting..."
                : currentOption?.description || "Not connected"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Set your status</div>
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.status}
              onClick={() => handleStatusChange(option.status)}
              className="flex items-center gap-3 py-3 rounded-md"
            >
              <StatusDot status={option.status} size="md" />
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
              {currentStatus === option.status && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
        {!isConnected && (
          <div className="border-t p-2">
            <div className="text-xs text-muted-foreground text-center">
              Status updates require connection
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
