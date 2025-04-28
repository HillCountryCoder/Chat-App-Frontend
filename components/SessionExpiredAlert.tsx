"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { jwtDecode } from "jwt-decode";
import { useLogout } from "@/hooks/use-auth";
import { X, Clock } from "lucide-react";
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

// Helper function to calculate token expiration time
const getTokenExpirationTime = (token: string): number => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded: any = jwtDecode(token);

    // Check if token has expiration (exp) claim
    if (!decoded.exp) return Infinity;

    // exp is in seconds, convert to milliseconds for countdown
    return decoded.exp * 1000;
  } catch (error) {
    console.error("Error decoding token:", error);
    return Date.now(); // Return current time if we can't decode the token
  }
};

export default function SessionExpiredAlert() {
  const { token } = useAuthStore();
  const logout = useLogout();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [expirationTime, setExpirationTime] = useState<number>(0);
  const [warningThreshold, setWarningThreshold] = useState<number>(0);

  useEffect(() => {
    if (!token) return;

    // Get absolute expiration time from token
    const expTime = getTokenExpirationTime(token);
    setExpirationTime(expTime);
    
    // Set warning to appear 5 minutes before expiration
    setWarningThreshold(expTime - (300 * 1000));
    
    // Check if we should show warning or expired dialog immediately
    const now = Date.now();
    
    if (now >= expTime) {
      setOpen(true);
    } else if (now >= warningThreshold) {
      setShowWarning(true);
    }
    
    // Set up interval to check every 30 seconds
    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      
      if (currentTime >= expTime) {
        setOpen(true);
        setShowWarning(false);
        clearInterval(intervalId);
      } else if (currentTime >= warningThreshold) {
        setShowWarning(true);
      }
    }, 30000);

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

  // Custom renderer for countdown
  const countdownRenderer = ({ minutes, seconds, completed }: { minutes: number, seconds: number, completed: boolean }) => {
    if (completed) {
      return <span>Expired</span>;
    } else {
      return (
        <span>
          {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
        </span>
      );
    }
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
          <Alert variant="warning">
            <Clock className="size-4" />
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