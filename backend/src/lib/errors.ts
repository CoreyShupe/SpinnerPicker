import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * A typed application error. Throw these from anywhere in a request lifecycle;
 * the central `onError` handler (see src/index.ts) turns them into a consistent
 * JSON envelope. Never construct ad-hoc error responses in route handlers.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string): ApiError {
    return new ApiError(400, 'bad_request', message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, 'not_found', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, 'conflict', message);
  }

  static unprocessable(message: string): ApiError {
    return new ApiError(422, 'unprocessable', message);
  }
}

/** Standard success envelope. Every successful response is `{ data: ... }`. */
export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ data }, status);
}
