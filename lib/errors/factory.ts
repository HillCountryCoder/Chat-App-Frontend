// src/lib/errors/factory.ts
import {
  BadRequestError,
  ClientError,
  ConflictError,
  DatabaseError,
  FileUploadError,
  ForbiddenError,
  InternalServerError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  RedisError,
  SocketError,
  UnauthorizedError,
  ValidationError,
} from "./error-classes";
import { BaseError } from "./base-error";
import {
  ErrorCode,
  ErrorCodes,
  ErrorDetails,
  HttpStatus,
  HttpStatusCode,
} from "./types";

/**
 * Factory function to create appropriate error class instances based on error code
 */
export function createErrorFromCode(
  code: ErrorCode,
  message: string,
  status?: HttpStatusCode,
  details?: ErrorDetails,
): BaseError {
  switch (code) {
    case ErrorCodes.VALIDATION:
      return new ValidationError(message, details);

    case ErrorCodes.NOT_FOUND:
      // For NOT_FOUND errors, try to extract resource name from message
      const resourceMatch = message.match(
        /The requested (.*) could not be found/,
      );
      const resource = resourceMatch ? resourceMatch[1] : "resource";
      return new NotFoundError(resource, details);

    case ErrorCodes.UNAUTHORIZED:
      return new UnauthorizedError(message, details);

    case ErrorCodes.FORBIDDEN:
      return new ForbiddenError(message, details);

    case ErrorCodes.DATABASE:
      return new DatabaseError(message, details);

    case ErrorCodes.BAD_REQUEST:
      return new BadRequestError(message, details);

    case ErrorCodes.SOCKET:
      return new SocketError(message, details);

    case ErrorCodes.REDIS:
      return new RedisError(message, details);

    case ErrorCodes.FILE_UPLOAD_FAILED:
      return new FileUploadError(message, details);

    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return new RateLimitError(message, details);

    case ErrorCodes.CONFLICT:
      return new ConflictError(message, details);

    case ErrorCodes.NETWORK_ERROR:
      return new NetworkError(message, details);

    case ErrorCodes.CLIENT_ERROR:
      return new ClientError(message, details);

    case ErrorCodes.INTERNAL:
    default:
      return new InternalServerError(message, details);
  }
}

/**
 * Factory function to create appropriate error from an HTTP response error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createErrorFromResponse(error: any): BaseError {
  // If it's an axios error with a response
  if (error.response && error.response.data) {
    const { status, data } = error.response;

    // If the backend sent a structured error
    if (
      typeof data === "object" &&
      data !== null &&
      "code" in data &&
      "message" in data
    ) {
      return createErrorFromCode(
        data.code,
        data.message,
        data.status || status,
        data.details,
      );
    }

    // Generic error with status
    return createStatusBasedError(status, error.message);
  }

  // Network errors (no response from server)
  if (error.request && !error.response) {
    return new NetworkError(
      "Unable to connect to the server. Please check your connection.",
      { originalError: error.message },
    );
  }

  // Unknown errors
  return new InternalServerError("An unexpected error occurred", {
    originalError: error.message || String(error),
  });
}

/**
 * Create error based on HTTP status code
 */
function createStatusBasedError(status: number, message?: string): BaseError {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return new BadRequestError(message || "Invalid request");

    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedError(message || "Authentication required");

    case HttpStatus.FORBIDDEN:
      return new ForbiddenError(message || "Access denied");

    case HttpStatus.NOT_FOUND:
      return new NotFoundError("resource", { message });

    case HttpStatus.CONFLICT:
      return new ConflictError(message || "Resource conflict");

    case HttpStatus.UNPROCESSABLE_ENTITY:
      return new ValidationError(message || "Validation failed");

    case HttpStatus.TOO_MANY_REQUESTS:
      return new RateLimitError(message);

    case HttpStatus.INTERNAL_SERVER_ERROR:
    case HttpStatus.BAD_GATEWAY:
    case HttpStatus.SERVICE_UNAVAILABLE:
    default:
      return new InternalServerError(
        message || "The server encountered an error",
      );
  }
}
