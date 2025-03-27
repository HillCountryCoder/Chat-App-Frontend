// components/ui/api-error.tsx
import { ApiError } from "@/lib/api";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface ApiErrorDisplayProps {
  error: ApiError | null | unknown;
  className?: string;
}

export function ApiErrorDisplay({
  error,
  className = "",
}: ApiErrorDisplayProps) {
  if (!error) return null;

  // Type guard to ensure we're dealing with our ApiError type
  const isApiError = (err: unknown): err is ApiError =>
    !!err && typeof err === "object" && "code" in err && "message" in err;

  if (!isApiError(error)) {
    // Fallback for unexpected error formats
    return (
      <div
        className={`rounded-md bg-destructive/10 p-3 text-sm text-destructive ${className}`}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">An unexpected error occurred</span>
        </div>
        <p>
          {error instanceof Error ? error.message : "Please try again later"}
        </p>
      </div>
    );
  }

  // Handle specific error codes
  const renderErrorContent = () => {
    switch (error.code) {
      case "NOT_FOUND":
        return (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">User not found</span>
            </div>
            <p>{error.message}</p>
            <p className="mt-1">
              Check if you&apos;ve entered the correct email or username, or{" "}
              <Link href="/register" className="text-primary hover:underline">
                create an account
              </Link>
            </p>
          </>
        );
      case "UNAUTHORIZED":
        return (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Invalid credentials</span>
            </div>
            <p>{error.message}</p>
          </>
        );
      case "VALIDATION_ERROR":
        return (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Validation failed</span>
            </div>
            <p>{error.message}</p>
          </>
        );
      default:
        return (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error: {error.code}</span>
            </div>
            <p>{error.message}</p>
          </>
        );
    }
  };

  return (
    <div
      className={`rounded-md bg-destructive/10 p-3 text-sm text-destructive ${className}`}
    >
      {renderErrorContent()}
    </div>
  );
}
