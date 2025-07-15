"use client";

import { usePresence } from "@/providers/presence-provider";
import { useSocket } from "@/providers/socket-provider";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConnectionStatusProps {
  variant?: "minimal" | "detailed" | "badge";
  className?: string;
  showRetry?: boolean;
}

export function ConnectionStatus({
  variant = "minimal",
  className,
  showRetry = true,
}: ConnectionStatusProps) {
  const {
    isConnected,
    isAuthenticated,
    connectionError,
    authenticatePresence,
  } = usePresence();
  const { isConnected: socketConnected, reconnect } = useSocket();
  const getStatusInfo = () => {
    if (!socketConnected) {
      return {
        status: "disconnected",
        icon: WifiOff,
        text: "Disconnected",
        description: "No connection to server",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    }

    if (connectionError) {
      return {
        status: "error",
        icon: AlertCircle,
        text: "Connection Error",
        description: connectionError,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    }

    if (!isAuthenticated) {
      return {
        status: "authenticating",
        icon: Wifi,
        text: "Connecting...",
        description: "Authenticating presence",
        color: "text-amber-600",
        bgColor: "bg-amber-100",
      };
    }

    if (isConnected && isAuthenticated) {
      return {
        status: "connected",
        icon: CheckCircle2,
        text: "Connected",
        description: "Presence system active",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    }

    return {
      status: "unknown",
      icon: AlertCircle,
      text: "Unknown",
      description: "Status unknown",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    };
  };
  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const handleRetry = () => {
    if (!socketConnected) {
      reconnect();
    } else if (!isAuthenticated) {
      authenticatePresence();
    }
  };
  // Minimal variant - just the icon
  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center", className)}>
              <Icon className={cn("h-4 w-4", statusInfo.color)} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{statusInfo.text}</div>
              <div className="text-xs text-muted-foreground">
                {statusInfo.description}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Badge variant - small status indicator
  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          statusInfo.bgColor,
          statusInfo.color,
          className,
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{statusInfo.text}</span>
      </div>
    );
  }

  // Detailed variant - full status with retry button
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        statusInfo.bgColor,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", statusInfo.color)} />
        <div>
          <div className={cn("font-medium", statusInfo.color)}>
            {statusInfo.text}
          </div>
          <div className="text-sm text-muted-foreground">
            {statusInfo.description}
          </div>
        </div>
      </div>

      {showRetry && statusInfo.status !== "connected" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
