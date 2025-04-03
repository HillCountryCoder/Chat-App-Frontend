"use client";

import React, { createContext, useContext, ReactNode, useState } from "react";
import { ApiErrorDisplay } from "@/components/api-error";
import { BaseError } from "@/lib/errors";
import { createErrorFromResponse } from "@/lib/errors/factory";
import { showErrorToast } from "@/lib/errors/toast-error-handler";
import { X } from "lucide-react";

interface ErrorContextType {
  // Set a global error to be displayed at the application level
  setGlobalError: (error: unknown, options?: { showToast?: boolean }) => void;
  // Clear the global error
  clearGlobalError: () => void;
  // Handle an error (show toast, set global error, or both)
  handleError: (
    error: unknown,
    options?: {
      showToast?: boolean;
      setGlobal?: boolean;
      throwError?: boolean;
    },
  ) => void;
  // The current global error
  globalError: BaseError | null;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
}

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [globalError, setGlobalErrorState] = useState<BaseError | null>(null);

  // Function to set a global error
  const setGlobalError = (
    error: unknown,
    options?: { showToast?: boolean },
  ) => {
    // Convert to BaseError if not already
    let baseError: BaseError;

    if (error instanceof BaseError) {
      baseError = error;
    } else {
      try {
        // Try to parse as API error response
        baseError = createErrorFromResponse(error);
      } catch (e) {
        // If conversion fails, create a generic error
        console.error("Failed to convert error to BaseError:", e,"\n" , error);
        baseError = createErrorFromResponse(
          new Error("An unexpected error occurred"),
        );
      }
    }

    // Set the global error state
    setGlobalErrorState(baseError);

    // Show toast if specified
    if (options?.showToast) {
      showErrorToast(baseError);
    }
  };

  // Function to clear the global error
  const clearGlobalError = () => {
    setGlobalErrorState(null);
  };

  // Combined function to handle errors in a consistent way
  const handleError = (
    error: unknown,
    options?: {
      showToast?: boolean;
      setGlobal?: boolean;
      throwError?: boolean;
    },
  ) => {
    // Default options
    const opts = {
      showToast: true,
      setGlobal: false,
      throwError: false,
      ...options,
    };

    // Show toast if specified
    if (opts.showToast) {
      showErrorToast(error);
    }

    // Set global error if specified
    if (opts.setGlobal) {
      setGlobalError(error, { showToast: false }); // Don't show toast twice
    }

    // Re-throw error if specified
    if (opts.throwError) {
      throw error instanceof BaseError ? error : createErrorFromResponse(error);
    }
  };

  const value: ErrorContextType = {
    setGlobalError,
    clearGlobalError,
    handleError,
    globalError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {/* Render the global error if present */}
      {globalError && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="relative">
            <ApiErrorDisplay error={globalError} />
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              onClick={clearGlobalError}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {children}
    </ErrorContext.Provider>
  );
}
