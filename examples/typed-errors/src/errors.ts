import { Data } from "effect";

/**
 * Network connectivity error (e.g. server unreachable, DNS failure).
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
}> {}

/**
 * Input validation error (e.g. invalid user input).
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly reason: string;
}> {}

/**
 * Resource not found error (e.g. user ID does not exist).
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string;
  readonly id: string;
}> {}

/**
 * Request timeout error.
 */
export class TimeoutError extends Data.TaggedError("TimeoutError")<{
  readonly durationMs: number;
}> {}

/**
 * Union of all application errors.
 * Exhaustive matching ensures all error types are handled.
 */
export type AppError =
  | NetworkError
  | ValidationError
  | NotFoundError
  | TimeoutError;
