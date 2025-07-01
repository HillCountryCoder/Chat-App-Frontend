"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { jwtDecode } from "jwt-decode";
import { useLogout } from "@/hooks/use-auth";
import { X, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Countdown from "react-countdown";
import Cookies from "js-cookie";
import { useTokenRefresh } from "@/hooks/use-refresh-token";

const getTokenExpirationTime = (token: string): number => {
  try {
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return Infinity;
    return decoded.exp * 1000;
  } catch (error) {
    console.error("Error decoding token:", error);
    return Date.now();
  }
};

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function SessionExpiredAlert() {
  const { token } = useAuthStore();
  const logout = useLogout();
  const refreshToken = useTokenRefresh();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [expirationTime, setExpirationTime] = useState<number>(0);

  const shouldShowAlerts = !authRoutes.includes(pathname);

  useEffect(() => {
    if (!token || !shouldShowAlerts) return;

    const expTime = getTokenExpirationTime(token);
    setExpirationTime(expTime);
    const warningTime = expTime - 300 * 1000; // 5 minutes before
    const now = Date.now();

    if (now >= expTime) {
      setOpen(true);
    } else if (now >= warningTime) {
      setShowWarning(true);
    }

    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime >= expTime) {
        setOpen(true);
        setShowWarning(false);
        clearInterval(intervalId);
      } else if (currentTime >= warningTime) {
        setShowWarning(true);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [token, shouldShowAlerts]);

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (error) {
      // If logout fails due to expired token, clear local state anyway
      console.warn("Logout failed, clearing local session:", error);
      logout.reset(); // Reset mutation state
      useAuthStore.getState().actions.logout();
      Cookies.remove("token");
      Cookies.remove("refreshToken");
    } finally {
      setOpen(false);
      setShowWarning(false);
      router.push("/login");
    }
  };

  const handleStayLoggedIn = async () => {
    try {
      await refreshToken.mutateAsync();
      setShowWarning(false);
      console.log("Token refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // If refresh fails, logout user
      handleLogout();
    }
  };

  const handleDismiss = () => {
    setShowWarning(false);
  };

  const countdownRenderer = ({
    hours,
    minutes,
    seconds,
    completed,
  }: {
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
  }) => {
    if (completed) {
      return <span>Expired</span>;
    }
    if (hours > 0) {
      return (
        <span>
          {hours}:{minutes < 10 ? `0${minutes}` : minutes}:
          {seconds < 10 ? `0${seconds}` : seconds}
        </span>
      );
    }
    return (
      <span>
        {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </span>
    );
  };

  if (!shouldShowAlerts) {
    return null;
  }

  return (
    <>
      {/* Session Expiration Alert */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Expired</AlertDialogTitle>
            <AlertDialogDescription>
              Your session has expired. Please log in again to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleLogout} disabled={logout.isPending}>
              {logout.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Log In Again"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Warning Alert */}
      {showWarning && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Clock className="h-4 w-4" />
            <AlertTitle>Session expiring soon</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <p>
                  Your session will expire in{" "}
                  <span className="font-semibold">
                    <Countdown
                      date={expirationTime}
                      renderer={countdownRenderer}
                      onComplete={() => setOpen(true)}
                    />
                  </span>
                  . Would you like to stay logged in?
                </p>
                <div className="flex justify-end gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    disabled={logout.isPending}
                  >
                    {logout.isPending ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      "Log Out"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleStayLoggedIn}
                    disabled={refreshToken.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {refreshToken.isPending ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      "Stay Logged In"
                    )}
                  </Button>
                </div>
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}
    </>
  );
}