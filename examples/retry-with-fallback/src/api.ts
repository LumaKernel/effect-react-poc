import { Effect, Schedule } from "effect";
import { ApiError } from "./errors.js";

/** Simulated call count for demonstrating retry behavior. */
let primaryCallCount = 0;
let fallbackCallCount = 0;

/**
 * Reset call counts (used by UI to restart demos).
 */
export const resetCallCounts = (): void => {
  primaryCallCount = 0;
  fallbackCallCount = 0;
};

/**
 * Simulates a primary API that fails most of the time.
 * Succeeds only after 4+ attempts to demonstrate retry exhaustion.
 *
 * Demonstrates: unreliable API that benefits from retry + fallback.
 */
export const fetchFromPrimaryApi = (): Effect.Effect<string, ApiError> =>
  Effect.gen(function* () {
    primaryCallCount++;
    yield* Effect.sleep("300 millis");

    if (primaryCallCount <= 4) {
      return yield* Effect.fail(
        new ApiError({
          source: "primary",
          message: `Primary API failed (attempt ${String(primaryCallCount) satisfies string})`,
        }),
      );
    }

    return `Data from Primary API (succeeded on attempt ${String(primaryCallCount) satisfies string})`;
  });

/**
 * Simulates a fallback API that is more reliable but slower.
 * Fails on first call to show retry within fallback too.
 *
 * Demonstrates: secondary data source as fallback.
 */
export const fetchFromFallbackApi = (): Effect.Effect<string, ApiError> =>
  Effect.gen(function* () {
    fallbackCallCount++;
    yield* Effect.sleep("500 millis");

    if (fallbackCallCount <= 1) {
      return yield* Effect.fail(
        new ApiError({
          source: "fallback",
          message: `Fallback API failed (attempt ${String(fallbackCallCount) satisfies string})`,
        }),
      );
    }

    return `Data from Fallback API (succeeded on attempt ${String(fallbackCallCount) satisfies string})`;
  });

/**
 * Returns cached data as a last resort.
 * Always succeeds.
 *
 * Demonstrates: local cache as final fallback.
 */
export const fetchFromLocalCache = (): Effect.Effect<string> =>
  Effect.gen(function* () {
    yield* Effect.sleep("50 millis");
    return "[Cached] Last known data from local cache";
  });

/**
 * Retry schedule: exponential backoff (100ms base) with max 3 retries.
 *
 * Demonstrates: Schedule.compose for retry strategy composition.
 * - `Schedule.exponential("100 millis")`: 100ms, 200ms, 400ms, ...
 * - `Schedule.recurs(2)`: up to 2 retries (3 total attempts)
 * - `Schedule.intersect`: combines both (stops when either exhausts)
 */
export const retrySchedule: Schedule.Schedule<unknown, ApiError> =
  Schedule.intersect(Schedule.exponential("100 millis"), Schedule.recurs(2));

/**
 * Complete fallback chain:
 * Primary API (with retries) → Fallback API (with retries) → Local Cache
 *
 * Demonstrates: Effect.catchAll for chaining fallback strategies.
 */
export const fetchWithFallbackChain = (): Effect.Effect<string> =>
  fetchFromPrimaryApi().pipe(
    Effect.retry(retrySchedule),
    Effect.catchAll(() =>
      fetchFromFallbackApi().pipe(
        Effect.retry(retrySchedule),
        Effect.catchAll(() => fetchFromLocalCache()),
      ),
    ),
  );
