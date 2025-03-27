export interface RequestContext {
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  socketId?: string;
}

export interface ErrorDetails {
  [key: string]: unknown;
  requestContext?: RequestContext;
}

export interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: ErrorDetails;
}

export const ErrorCodes = {
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  DATABASE: "DATABASE_ERROR",
  INTERNAL: "INTERNAL_SERVER_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  SOCKET: "SOCKET_ERROR",
  REDIS: "REDIS_ERROR",
  FILE_UPLOAD_FAILED: "FILE_UPLOAD_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CONFLICT: "CONFLICT",
  NETWORK_ERROR: "NETWORK_ERROR",
  CLIENT_ERROR: "CLIENT_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "code" in error &&
    "message" in error &&
    typeof (error as ApiErrorResponse).status === "number" &&
    typeof (error as ApiErrorResponse).code === "string" &&
    typeof (error as ApiErrorResponse).message === "string"
  );
}
