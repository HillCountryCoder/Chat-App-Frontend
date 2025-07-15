"use client";

import { cn } from "@/lib/utils";
import { usePresenceIndicator } from "@/hooks/use-presence-indicator";
import { PRESENCE_STATUS } from "@/types/presence";

interface PresenceIndicatorProps {
  userId: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showLastSeen?: boolean;
  className?: string;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

export function PresenceIndicator({
  userId,
  size = "md",
  showText = false,
  showLastSeen = false,
  className,
  position = "bottom-right",
}: PresenceIndicatorProps) {
  const indicator = usePresenceIndicator(userId);
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const positionClasses = {
    "top-right": "top-0 right-0",
    "bottom-right": "bottom-0 right-0",
    "top-left": "top-0 left-0",
    "bottom-left": "bottom-0 left-0",
  };

  if (!indicator.showDot) {
    return null;
  }

  const DotComponent = () => (
    <div
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        indicator.dotClassName,
        className,
      )}
      style={{ backgroundColor: indicator.color }}
      title={indicator.displayText}
    />
  );

  // If showing text or last seen, render as inline component
  if (showText || showLastSeen) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DotComponent />
        <div className="flex flex-col">
          {showText && (
            <span
              className="text-sm font-medium"
              style={{ color: indicator.textColor }}
            >
              {indicator.displayText}
            </span>
          )}
          {showLastSeen && indicator.lastSeenText && (
            <span className="text-xs text-muted-foreground">
              {indicator.lastSeenText}
            </span>
          )}
        </div>
      </div>
    );
  }
  // Default: positioned dot (for avatars)
  return (
    <div className={cn("absolute", positionClasses[position], className)}>
      <DotComponent />
    </div>
  );
}

export function StatusDot({
  status,
  size = "md",
  className,
}: {
  status: PRESENCE_STATUS;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const getStatusColor = (status: PRESENCE_STATUS) => {
    switch (status) {
      case PRESENCE_STATUS.ONLINE:
        return "bg-green-500";
      case PRESENCE_STATUS.AWAY:
        return "bg-amber-400";
      case PRESENCE_STATUS.BUSY:
        return "bg-red-500";
      case PRESENCE_STATUS.OFFLINE:
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        getStatusColor(status),
        className,
      )}
    />
  );
}
