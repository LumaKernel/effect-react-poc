import { Data } from "effect";

/**
 * Primary API failure - network or server error.
 */
export class ApiError extends Data.TaggedError("ApiError")<{
  readonly source: string;
  readonly message: string;
}> {}

/**
 * All errors that can occur in API operations.
 */
export type AppError = ApiError;
