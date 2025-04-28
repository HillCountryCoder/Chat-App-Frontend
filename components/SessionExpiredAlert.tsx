"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { jwtDecode } from "jwt-decode";
import { useLogout } from "@/hooks/use-auth";
import { X } from "lucide-react";
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

// Helper function to calculate time remaining
const getTokenRemainingTime = (token: string): number => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded: any = jwtDecode(token);

    // Check if token has expiration (exp) claim
    if (!decoded.exp) return Infinity;

    // exp is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    const expiryTime = decoded.exp;

    // Return remaining time in seconds
    return Math.max(0, expiryTime - currentTime);
  } catch (error) {
    console.error("Error decoding token:", error);
    return 0; // Return 0 if we can't decode the token
  }
};

// Convert seconds to minutes and seconds format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function SessionExpiredAlert() {
  const { token } = useAuthStore();
  const logout = useLogout();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Calculate time remaining until token expires
    const checkExpiration = () => {
      const remainingTime = getTokenRemainingTime(token);
      setTimeRemaining(remainingTime);

      // Show warning when less than 5 minutes remaining
      if (remainingTime > 0 && remainingTime < 300) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      // Show expired dialog when token expires
      if (remainingTime <= 0) {
        setOpen(true);
        setShowWarning(false);
      }
    };

    // Initial check
    checkExpiration();

    // Set up interval to check every 30 seconds
    const intervalId = setInterval(checkExpiration, 30000);

    return () => clearInterval(intervalId);
  }, [token]);

  const handleLogout = async () => {
    await logout.mutateAsync();
    setOpen(false);
    setShowWarning(false);
    router.push("/login");
  };

  const handleStayLoggedIn = () => {
    // Here you would implement logic to refresh the token
    // For this example, we'll just dismiss the warning
    setShowWarning(false);
  };

  const handleDismiss = () => {
    setShowWarning(false);
  };

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
            <AlertDialogAction onClick={handleLogout}>
              Log In Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Warning Alert */}
      {showWarning && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <Alert
            variant="warning"
            className="border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          >
            <AlertTitle className="font-semibold">
              Session expiring soon
            </AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <p>
                  Your session will expire in {formatTime(timeRemaining)}. Would
                  you like to stay logged in?
                </p>
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Log Out
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleStayLoggedIn}
                  >
                    Stay Logged In
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
