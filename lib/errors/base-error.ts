import {
  ApiErrorResponse,
  ErrorCode,
  ErrorDetails,
  HttpStatusCode,
} from "./types";

/**
 * Base error class for handling API errors consistently across the frontend
 * Mirrors the backend's BaseError class structure
 */
export abstract class BaseError extends Error {
  readonly status: HttpStatusCode;
  readonly code: ErrorCode;
  public details?: ErrorDetails;

  constructor(
    message: string,
    status: HttpStatusCode,
    code: ErrorCode,
    details?: ErrorDetails,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;

    Object.setPrototypeOf(this, BaseError.prototype);
  }

  /**
   * Convert the error to a response object that matches backend error format
   */
  toResponse(): ApiErrorResponse {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  /**
   * Factory method to create a BaseError instance from an API error response
   */
  static async fromApiResponse(response: ApiErrorResponse): Promise<BaseError> {
    // Import dynamically to avoid circular dependency
    const { createErrorFromCode } = await import("./factory");
    return createErrorFromCode(
      response.code as ErrorCode,
      response.message,
      response.status as HttpStatusCode,
      response.details,
    );
  }
}
