"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceIndicator } from "./PresenceIndicator";
import { cn } from "@/lib/utils";

interface PresenceAwareAvatarProps {
  userId: string;
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showPresence?: boolean;
  presencePosition?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
  presenceSize?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function PresenceAwareAvatar({
  userId,
  src,
  alt,
  fallback,
  size = "md",
  showPresence = true,
  presencePosition = "bottom-right",
  presenceSize = "md",
  className,
  onClick,
}: PresenceAwareAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const fallbackSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  return (
    <div
      className={cn("relative", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <Avatar className={cn(sizeClasses[size])}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback className={fallbackSizeClasses[size]}>
          {fallback}
        </AvatarFallback>
      </Avatar>

      {showPresence && (
        <PresenceIndicator
          userId={userId}
          size={presenceSize}
          position={presencePosition}
          className="ring-2 ring-background"
        />
      )}
    </div>
  );
}
