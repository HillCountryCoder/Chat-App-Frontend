"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ApiErrorDisplay } from "@/components/api-error";
import { Button } from "@/components/ui/button";
import { BaseError, ClientError } from "@/lib/errors";
import { ArrowLeftCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child component tree
 * and display a fallback UI instead of crashing the whole app
 */

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, use our default error UI
      let error: BaseError;

      // Wrap non-BaseError errors in ClientError
      if (this.state.error instanceof BaseError) {
        error = this.state.error;
      } else {
        error = new ClientError(
          this.state.error?.message || "An unexpected error occurred",
          {
            originalError: this.state.error,
            stack: this.state.error?.stack,
          },
        );
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
          <div className="max-w-md w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Something went wrong
              </h2>
              <p className="text-muted-foreground">
                We&apos;re sorry for the inconvenience. The error has been logged and
                we&apos;re working on it.
              </p>
            </div>

            <ApiErrorDisplay
              error={error}
              showDetails={process.env.NODE_ENV === "development"}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="default"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh page</span>
              </Button>

              <Button variant="outline" asChild className="gap-2">
                <Link href="/chat">
                  <Home className="h-4 w-4" />
                  <span>Go home</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowLeftCircle className="h-4 w-4" />
                <span>Go back</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
