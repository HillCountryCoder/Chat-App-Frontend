// src/lib/errors/toast-error-handler.ts
import { toast } from "sonner";
import { BaseError, ErrorCodes } from "./index";

/**
 * Shows toast notifications for errors that should be shown as toasts
 * instead of inline error messages (like network errors)
 */
export function showErrorToast(error: unknown) {
  if (!(error instanceof BaseError)) {
    // For non-BaseError instances, show a generic error toast
    toast.error("An unexpected error occurred");
    return;
  }

  // Determine which errors should be shown as toasts
  // Some errors are better shown inline (form validation errors, etc.)
  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      toast.error("Network error. Please check your connection and try again.");
      break;

    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      toast.error("Rate limit exceeded. Please wait a moment and try again.");
      break;

    case ErrorCodes.INTERNAL:
      toast.error("Server error. Our team has been notified of the issue.");
      break;

    case ErrorCodes.DATABASE:
    case ErrorCodes.REDIS:
      toast.error("System error. Please try again later.");
      break;

    // Don't show toasts for these errors, as they should be displayed inline
    case ErrorCodes.VALIDATION:
    case ErrorCodes.BAD_REQUEST:
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.CONFLICT:
      // Do nothing for these errors
      break;

    default:
      toast.error(error.message || "An unexpected error occurred");
  }
}

/**
 * Higher-order function that wraps an async function with error handling
 * This is useful for handling errors in a consistent way
 *
 * @param fn The async function to wrap
 * @param options Configuration for error handling
 * @returns The wrapped function that handles errors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    showToast?: boolean;
    onError?: (error: unknown) => void;
  } = { showToast: true },
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Call the onError callback if provided
      if (options.onError) {
        options.onError(error);
      }

      // Show toast notification if enabled
      if (options.showToast) {
        showErrorToast(error);
      }

      // Re-throw the error so it can be handled by the caller if needed
      throw error;
    }
  }) as T;
}
