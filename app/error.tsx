"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorDisplay } from "@/components/api-error";
import { BaseError } from "@/lib/errors";
import { createErrorFromResponse } from "@/lib/errors/factory";
import { Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js Error Page:", error);
    // Here you would typically log to a service like Sentry
    // if (typeof window !== 'undefined') {
    //   import('@sentry/browser').then(({ captureException }) => {
    //     captureException(error);
    //   });
    // }
  }, [error]);
  const baseError =
    error instanceof BaseError ? error : createErrorFromResponse(error);
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-muted-foreground">
            We&apos;re sorry for the inconvenience. The application encountered
            an error.
          </p>
        </div>

        <ApiErrorDisplay
          error={baseError}
          showDetails={process.env.NODE_ENV === "development"}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="default" onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Try again</span>
          </Button>

          <Button variant="outline" asChild className="gap-2">
            <Link href="/chat">
              <Home className="h-4 w-4" />
              <span>Go home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
