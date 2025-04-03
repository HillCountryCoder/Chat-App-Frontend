/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/use-async.ts
import { useState, useCallback, useEffect } from "react";
import { BaseError } from "@/lib/errors";
import { useError } from "@/providers/error-providers";
import { createErrorFromResponse } from "@/lib/errors/factory";

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  showErrorToast?: boolean;
  showErrorInline?: boolean;
  setGlobalError?: boolean;
  autoRun?: boolean;
  deps?: any[];
}

interface UseAsyncReturn<T, P extends any[]> {
  execute: (...params: P) => Promise<T | undefined>;
  data: T | null;
  error: BaseError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/**
 * A hook for handling async operations with comprehensive error handling.
 *
 * @param asyncFunction The async function to execute
 * @param options Configuration options
 * @returns Object with the result and execution methods
 */
export function useAsync<T, P extends any[] = []>(
  asyncFunction: (...params: P) => Promise<T>,
  options: UseAsyncOptions<T> = {},
): UseAsyncReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<BaseError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Options with defaults
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    showErrorInline = true,
    setGlobalError = false,
    autoRun = false,
    deps = [],
  } = options;

  // Get error handling utilities from context
  const { handleError } = useError();

  // Reset state
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
  }, []);

  // Execute the async function
  const execute = useCallback(
    async (...params: P): Promise<T | undefined> => {
      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        const result = await asyncFunction(...params);

        setData(result);
        setIsSuccess(true);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        setIsError(true);

        // Only set inline error if enabled
        if (showErrorInline) {
          // Ensure error is a BaseError
          if (err instanceof BaseError) {
            setError(err);
          } else {
            const baseError = createErrorFromResponse(err);
            setError(baseError);
          }
        }

        // Handle error with global error handling
        handleError(err, {
          showToast: showErrorToast,
          setGlobal: setGlobalError,
          throwError: false,
        });

        // Call onError callback if provided
        if (onError) {
          onError(err);
        }

        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [
      asyncFunction,
      handleError,
      onError,
      onSuccess,
      setGlobalError,
      showErrorInline,
      showErrorToast,
    ],
  );

  // Auto-run the function if enabled
  useEffect(() => {
    if (autoRun) {
      execute(...([] as unknown as P));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, execute, ...deps]);

  return {
    execute,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    reset,
  };
}
