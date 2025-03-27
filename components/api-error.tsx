// src/components/ui/api-error.tsx
import {
  ApiErrorResponse,
  BaseError,
  ErrorCodes,
  isApiErrorResponse,
} from "@/lib/errors";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  ServerCrash,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ApiErrorDisplayProps {
  error: unknown;
  className?: string;
  showIcon?: boolean;
  showDetails?: boolean;
  actions?: ReactNode;
}

export function ApiErrorDisplay({
  error,
  className = "",
  showIcon = true,
  showDetails = false,
  actions,
}: ApiErrorDisplayProps) {
  // If there's no error, don't render anything
  if (!error) return null;

  // Convert the error to a consistent format
  let errorData: ApiErrorResponse;

  if (error instanceof BaseError) {
    errorData = error.toResponse();
  } else if (isApiErrorResponse(error)) {
    errorData = error;
  } else if (error instanceof Error) {
    errorData = {
      status: 500,
      code: ErrorCodes.CLIENT_ERROR,
      message: error.message || "An unexpected error occurred",
      details: { stack: error.stack },
    };
  } else {
    errorData = {
      status: 500,
      code: ErrorCodes.CLIENT_ERROR,
      message: String(error) || "An unexpected error occurred",
    };
  }

  // Get the appropriate icon based on error code
  const ErrorIcon = getErrorIcon(errorData.code);

  // Get error theme (color) based on severity
  const errorTheme = getErrorTheme(errorData.code);

  // Get help text based on error code
  const helpText = getHelpText(errorData);

  // Render the error
  return (
    <div
      className={cn(
        `rounded-md p-4 text-sm ${errorTheme.bg} ${errorTheme.text}`,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="flex-shrink-0 pt-0.5">
            <ErrorIcon className="h-5 w-5" />
          </div>
        )}

        <div className="flex-1">
          <div className="font-semibold mb-1">{getErrorTitle(errorData)}</div>

          <div className="text-sm opacity-90">{errorData.message}</div>

          {helpText && (
            <div className="mt-2 text-sm opacity-80">{helpText}</div>
          )}

          {showDetails && errorData.details && (
            <div className="mt-2 text-xs opacity-70">
              <details>
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 p-2 rounded bg-black/10 dark:bg-white/10 overflow-auto text-xs">
                  {JSON.stringify(errorData.details, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {actions && <div className="mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getErrorIcon(code: string) {
  switch (code) {
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.FORBIDDEN:
      return Ban;
    case ErrorCodes.VALIDATION:
    case ErrorCodes.BAD_REQUEST:
      return AlertTriangle;
    case ErrorCodes.NOT_FOUND:
      return X;
    case ErrorCodes.NETWORK_ERROR:
      return WifiOff;
    case ErrorCodes.INTERNAL:
    case ErrorCodes.DATABASE:
    case ErrorCodes.REDIS:
      return ServerCrash;
    default:
      return AlertCircle;
  }
}

function getErrorTheme(code: string) {
  switch (code) {
    case ErrorCodes.VALIDATION:
    case ErrorCodes.BAD_REQUEST:
      return {
        bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
        text: "text-yellow-700 dark:text-yellow-400",
      };
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.FORBIDDEN:
      return {
        bg: "bg-orange-500/10 dark:bg-orange-500/20",
        text: "text-orange-700 dark:text-orange-400",
      };
    case ErrorCodes.NOT_FOUND:
      return {
        bg: "bg-gray-500/10 dark:bg-gray-500/20",
        text: "text-gray-700 dark:text-gray-400",
      };
    default:
      return {
        bg: "bg-destructive/10 dark:bg-destructive/20",
        text: "text-destructive dark:text-destructive-foreground",
      };
  }
}

function getErrorTitle(error: ApiErrorResponse): string {
  switch (error.code) {
    case ErrorCodes.VALIDATION:
      return "Validation Error";
    case ErrorCodes.NOT_FOUND:
      return "Not Found";
    case ErrorCodes.UNAUTHORIZED:
      return "Authentication Required";
    case ErrorCodes.FORBIDDEN:
      return "Access Denied";
    case ErrorCodes.CONFLICT:
      return "Conflict Error";
    case ErrorCodes.NETWORK_ERROR:
      return "Network Error";
    case ErrorCodes.BAD_REQUEST:
      return "Invalid Request";
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return "Rate Limit Exceeded";
    case ErrorCodes.DATABASE:
      return "Database Error";
    case ErrorCodes.INTERNAL:
      return "Server Error";
    default:
      return "Error";
  }
}

function getHelpText(error: ApiErrorResponse): ReactNode {
  switch (error.code) {
    case ErrorCodes.VALIDATION:
      return "Please check the information you provided and try again.";

    case ErrorCodes.NOT_FOUND:
      if (error.message.includes("user")) {
        return (
          <>
            Check if you&apos;ve entered the correct email or username, or{" "}
            <Link href="/register" className="underline font-medium">
              create an account
            </Link>
            .
          </>
        );
      }
      return "The requested resource could not be found.";

    case ErrorCodes.UNAUTHORIZED:
      return (
        <>
          Please check your credentials or{" "}
          <Link href="/login" className="underline font-medium">
            log in again
          </Link>
          .
        </>
      );

    case ErrorCodes.FORBIDDEN:
      return "You don't have permission to access this resource.";

    case ErrorCodes.NETWORK_ERROR:
      return "Please check your internet connection and try again.";

    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return "You've made too many requests. Please wait a moment and try again.";

    default:
      return null;
  }
}
