import React from "react";
import { useActiveSessions, useLogoutAll } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";

const getDeviceIcon = (deviceInfo?: string) => {
  if (!deviceInfo) return <Globe className="h-4 w-4" />;

  const info = deviceInfo.toLowerCase();
  if (
    info.includes("mobile") ||
    info.includes("iphone") ||
    info.includes("android")
  ) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (info.includes("tablet") || info.includes("ipad")) {
    return <Tablet className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
};

const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) return { browser: "Unknown", os: "Unknown" };

  // Simple parsing - you might want to use a library like 'ua-parser-js' for better parsing
  let browser = "Unknown";
  let os = "Unknown";

  // Browser detection
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  // OS detection
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS")) os = "iOS";

  return { browser, os };
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

export default function SessionManagement() {
  const { data: sessions, isLoading, error } = useActiveSessions();
  const logoutAll = useLogoutAll();
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading sessions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Failed to load sessions. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage your active login sessions across all devices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Session Info */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              You have {sessions?.length || 0} active session
              {sessions?.length !== 1 ? "s" : ""}
            </div>

            {sessions && sessions.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={logoutAll.isPending}
                  >
                    {logoutAll.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        End All Sessions
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End All Sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will log you out from all devices and browsers.
                      You&apos;ll need to log in again on each device. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => logoutAll.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      End All Sessions
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <Separator />

          {/* Sessions List */}
          <div className="space-y-3">
            {sessions?.map((session, index) => {
              const { browser, os } = parseUserAgent(session.userAgent);
              const isCurrentSession = index === 0; // Assuming first session is current

              return (
                <div
                  key={session._id}
                  className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getDeviceIcon(session.deviceInfo)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">
                          {browser} on {os}
                        </p>
                        {isCurrentSession && (
                          <Badge variant="secondary" className="text-xs">
                            Current Session
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-xs text-muted-foreground">
                      {session.ipAddress && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.ipAddress}</span>
                        </div>
                      )}

                      {session.lastUsed && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Last used {formatDate(session.lastUsed)}</span>
                        </div>
                      )}
                    </div>

                    {session.deviceInfo && (
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {session.deviceInfo}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {(!sessions || sessions.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No active sessions found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
