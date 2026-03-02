import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Cause, Effect, Fiber, Stream } from "effect";
import type { EffectResult } from "@effect-react/core";
import {
  createSubscribable,
  failure,
  initial,
  pending,
  success,
} from "@effect-react/core";
import type { EffectManagedRuntime } from "./EffectProvider.js";
import { useEffectRuntime } from "./EffectProvider.js";

/**
 * Result of `useEffectStream`.
 *
 * When modifying this interface:
 * - Update tests in `packages/react/tests/useEffectStream.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 */
export interface StreamResult<A, E> {
  /** Current state: Initial (idle), Pending (consuming), Success (latest value), or Failure (error). */
  readonly result: EffectResult<A, E>;
}

/**
 * Internal state for a stream subscription.
 * Holds the subscribable and the current fiber for cleanup.
 *
 * The stream fiber runs `Stream.runForEach`, updating the subscribable
 * on each emitted value. When interrupted (unmount or stream change),
 * the stream is cleaned up via Fiber.interrupt.
 */
interface StreamInternals<A, E> {
  readonly subscribable: ReturnType<
    typeof createSubscribable<EffectResult<A, E>>
  >;
  fiber: Fiber.RuntimeFiber<unknown, unknown> | null;
}

const interruptFiber = (
  runtime: EffectManagedRuntime<unknown, unknown>,
  internals: Pick<StreamInternals<unknown, unknown>, "fiber">,
): void => {
  if (internals.fiber !== null) {
    runtime.runFork(Fiber.interruptFork(internals.fiber));
    internals.fiber = null;
  }
};

const startStream = <A, E>(
  runtime: EffectManagedRuntime<unknown, unknown>,
  internals: StreamInternals<A, E>,
  stream: Stream.Stream<A, E>,
): void => {
  // Cancel any previous stream fiber
  interruptFiber(runtime, internals);

  internals.subscribable.set(pending);

  // Consume the stream: update subscribable on each value.
  // On typed error (E), transition to Failure with Cause.fail(e).
  // On stream completion, keep the last emitted value.
  // Interrupts (unmount / stream change) propagate naturally
  // and do not update state.
  const consumeEffect = Stream.runForEach(stream, (value: A) =>
    Effect.sync(() => {
      internals.subscribable.set(success(value));
    }),
  ).pipe(
    Effect.catchAll((error: E) =>
      Effect.sync(() => {
        internals.subscribable.set(failure(Cause.fail(error)));
      }),
    ),
  );

  const fiber = runtime.runFork(consumeEffect);
  internals.fiber = fiber;
};

/**
 * React hook that subscribes to an Effect Stream and returns the latest emitted value.
 *
 * - Uses `useSyncExternalStore` to subscribe to a Subscribable
 * - Returns `StreamResult<A, E>` containing `EffectResult<A, E>`
 * - Consumes the stream via `Stream.runForEach`, updating state on each emission
 * - Interrupts the stream on unmount or when the stream reference changes
 * - Backpressure: pull-based consumption via `runForEach` means the stream
 *   advances only as fast as the consumer processes each value
 *
 * State transitions:
 * - `Initial` → `Pending` (stream started)
 * - `Pending` → `Success` (first value emitted)
 * - `Success` → `Success` (subsequent values emitted, latest wins)
 * - `Pending`/`Success` → `Failure` (stream error, non-interrupt only)
 *
 * When modifying this hook:
 * - Update tests in `packages/react/tests/useEffectStream.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 *
 * @param stream - The Effect Stream to subscribe to
 * @returns StreamResult with the current state
 */
export const useEffectStream = <A, E>(
  stream: Stream.Stream<A, E>,
): StreamResult<A, E> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtime = useEffectRuntime<any, any>();

  const streamRef = useRef(stream);
  streamRef.current = stream;

  const internals = useMemo(
    (): StreamInternals<A, E> => ({
      subscribable: createSubscribable<EffectResult<A, E>>(initial),
      fiber: null,
    }),
    // runtime change means a new provider, so recreate internals
    [runtime],
  );

  // Start the stream on mount and restart when stream reference changes
  useEffect(() => {
    startStream(runtime, internals, streamRef.current);

    return () => {
      interruptFiber(runtime, internals);
    };
  }, [runtime, internals]);

  const result = useSyncExternalStore(
    internals.subscribable.subscribe,
    internals.subscribable.getSnapshot,
  );

  return { result };
};
