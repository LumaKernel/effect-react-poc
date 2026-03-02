import { Effect } from "effect";
import {
  NetworkError,
  NotFoundError,
  TimeoutError,
  ValidationError,
} from "./errors.js";
import type { AppError } from "./errors.js";

/**
 * Simulates fetching a user profile. Randomly fails with different error types.
 *
 * Demonstrates: Data.TaggedError with discriminated union for typed errors.
 */
export const fetchUserProfile = (
  userId: string,
): Effect.Effect<string, AppError> =>
  Effect.gen(function* () {
    yield* Effect.sleep("500 millis");

    const roll = Math.random();

    if (roll < 0.25) {
      return yield* Effect.fail(new NetworkError({ url: "/api/users" }));
    }
    if (roll < 0.5) {
      return yield* Effect.fail(
        new NotFoundError({ resource: "User", id: userId }),
      );
    }
    if (roll < 0.75) {
      return yield* Effect.fail(new TimeoutError({ durationMs: 5000 }));
    }

    return `User ${userId satisfies string}: Alice Johnson`;
  });

/**
 * Simulates form submission with validation.
 * Fails with ValidationError if the input is "bad", otherwise succeeds.
 *
 * Demonstrates: Schema-like validation error with typed error handling.
 */
export const submitForm = (input: string): Effect.Effect<string, AppError> =>
  Effect.gen(function* () {
    yield* Effect.sleep("300 millis");

    if (input.trim() === "") {
      return yield* Effect.fail(
        new ValidationError({ field: "name", reason: "Name is required" }),
      );
    }
    if (input.length < 3) {
      return yield* Effect.fail(
        new ValidationError({
          field: "name",
          reason: "Name must be at least 3 characters",
        }),
      );
    }

    return `Submitted: ${input satisfies string}`;
  });

/**
 * Fetches user profile with catchTag: converts NotFoundError to a fallback value,
 * while letting other errors propagate.
 *
 * Demonstrates: Effect.catchTag for selective error recovery.
 */
export const fetchUserWithFallback = (
  userId: string,
): Effect.Effect<string, NetworkError | ValidationError | TimeoutError> =>
  fetchUserProfile(userId).pipe(
    Effect.catchTag("NotFoundError", (error) =>
      Effect.succeed(
        `[Fallback] User ${error.id satisfies string} not found, showing default profile`,
      ),
    ),
  );
