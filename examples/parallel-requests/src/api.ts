/**
 * Simulated API service for demonstrating parallel request patterns.
 * Each "endpoint" is an Effect that simulates network delay and potential failure.
 */
import { Data, Effect } from "effect";

export class ApiError extends Data.TaggedError("ApiError")<{
  readonly endpoint: string;
  readonly message: string;
}> {}

/** Simulates a successful API call with configurable delay */
export const fetchEndpoint = (
  name: string,
  delayMs: number,
): Effect.Effect<string> =>
  Effect.sleep(delayMs).pipe(
    Effect.map(
      () =>
        `${name satisfies string}: responded in ${String(delayMs) satisfies string}ms`,
    ),
  );

/** Simulates an API call that may fail based on shouldFail flag */
export const fetchEndpointMayFail = (
  name: string,
  delayMs: number,
  shouldFail: boolean,
): Effect.Effect<string, ApiError> =>
  Effect.sleep(delayMs).pipe(
    Effect.flatMap(() =>
      shouldFail
        ? Effect.fail(
            new ApiError({
              endpoint: name,
              message: `${name satisfies string} failed`,
            }),
          )
        : Effect.succeed(
            `${name satisfies string}: responded in ${String(delayMs) satisfies string}ms`,
          ),
    ),
  );

/** Simulates a mirror server with variable latency */
export const fetchMirror = (
  mirrorId: number,
  delayMs: number,
): Effect.Effect<string> =>
  Effect.sleep(delayMs).pipe(
    Effect.map(
      () =>
        `Mirror ${String(mirrorId) satisfies string}: responded in ${String(delayMs) satisfies string}ms (fastest!)`,
    ),
  );

/** Simulates a task with progress tracking callback */
export const fetchWithProgress = (
  taskId: number,
  delayMs: number,
  onStart: () => void,
  onComplete: () => void,
): Effect.Effect<string> =>
  Effect.sync(onStart).pipe(
    Effect.flatMap(() => Effect.sleep(delayMs)),
    Effect.map(() => {
      onComplete();
      return `Task ${String(taskId) satisfies string}: done in ${String(delayMs) satisfies string}ms`;
    }),
  );
