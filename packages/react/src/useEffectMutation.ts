import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { Cause } from "effect";
import { Effect, Exit, Fiber } from "effect";
import type { EffectResult, OptimisticRollback } from "@effect-react/core";
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
 * Options for `useEffectMutation`.
 *
 * When adding a new option:
 * - Update tests in `packages/react/tests/useEffectMutation.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 */
export interface MutationOptions<I, A, E> {
  /**
   * Called before the mutation effect is executed.
   * Use this to perform optimistic updates on query caches.
   * If this returns an `OptimisticRollback`, it will be automatically
   * rolled back when the mutation fails.
   */
  readonly onMutate?: (input: I) => OptimisticRollback | undefined;
  /**
   * Called when the mutation succeeds.
   */
  readonly onSuccess?: (value: A, input: I) => void;
  /**
   * Called when the mutation fails.
   * Automatic rollback (from `onMutate`) happens before this callback.
   */
  readonly onError?: (cause: Cause.Cause<E>, input: I) => void;
}

/**
 * Result of `useEffectMutation`.
 *
 * When modifying this interface:
 * - Update tests in `packages/react/tests/useEffectMutation.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 */
export interface MutationState<I, A, E> {
  /** Current state: Initial (idle), Pending, Success, or Failure. */
  readonly result: EffectResult<A, E>;
  /** Trigger the mutation. Cancels any previous in-flight mutation. */
  readonly mutate: (input: I) => void;
  /** Reset the state to Initial (idle). Cancels any in-flight mutation. */
  readonly reset: () => void;
}

/**
 * Internal state for a mutation.
 * Holds the subscribable and the current fiber for cleanup.
 *
 * Only the mutation fiber is tracked. The observer fiber (which waits on
 * `Fiber.await` and updates the subscribable) is not interrupted directly.
 * Instead, when the mutation fiber is interrupted, `Fiber.await` returns an
 * Interrupt exit, and the `internals.fiber !== fiber` guard prevents stale
 * updates. This matches the EffectStore pattern.
 */
interface MutationInternals<A, E> {
  readonly subscribable: ReturnType<
    typeof createSubscribable<EffectResult<A, E>>
  >;
  fiber: Fiber.RuntimeFiber<unknown, unknown> | null;
  rollback: OptimisticRollback | null;
}

const interruptFiber = (
  runtime: EffectManagedRuntime<unknown, unknown>,
  internals: Pick<MutationInternals<unknown, unknown>, "fiber">,
): void => {
  if (internals.fiber !== null) {
    runtime.runFork(Fiber.interruptFork(internals.fiber));
    internals.fiber = null;
  }
};

/**
 * React hook for manual-trigger Effect execution (mutations).
 *
 * Unlike `useEffectQuery`, mutations:
 * - Are not automatically executed on mount
 * - Are not cached or shared across components
 * - Are triggered explicitly via `mutate(input)`
 * - Cancel previous in-flight mutations on re-trigger
 *
 * Uses `EffectResult` for state tracking:
 * - `Initial` = idle (not yet triggered)
 * - `Pending` = mutation in progress
 * - `Success` = mutation succeeded
 * - `Failure` = mutation failed
 *
 * Supports optimistic updates via `options.onMutate`:
 * - `onMutate(input)` is called before the mutation effect runs
 * - If it returns an `OptimisticRollback`, it's automatically rolled back on failure
 * - `onSuccess` and `onError` callbacks are called after the mutation completes
 *
 * When modifying this hook:
 * - Update tests in `packages/react/tests/useEffectMutation.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 *
 * @param effectFn - Function that creates an Effect from the input
 * @param options - Optional callbacks for optimistic updates (onMutate, onSuccess, onError)
 * @returns MutationState with result, mutate, and reset
 */
export const useEffectMutation = <I, A, E>(
  effectFn: (input: I) => Effect.Effect<A, E>,
  options?: MutationOptions<I, A, E>,
): MutationState<I, A, E> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtime = useEffectRuntime<any, any>();

  const effectFnRef = useRef(effectFn);
  effectFnRef.current = effectFn;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const internals = useMemo(
    (): MutationInternals<A, E> => ({
      subscribable: createSubscribable<EffectResult<A, E>>(initial),
      fiber: null,
      rollback: null,
    }),
    // runtime change means a new provider, so recreate internals
    [runtime],
  );

  // Cleanup on unmount or runtime change
  useEffect(() => {
    return () => {
      interruptFiber(runtime, internals);
    };
  }, [runtime, internals]);

  const mutate = useCallback(
    (input: I): void => {
      // Cancel any previous mutation fiber
      interruptFiber(runtime, internals);
      // Clear any previous rollback (a new mutation supersedes it)
      internals.rollback = null;

      // Call onMutate before starting the effect (optimistic updates)
      const rollbackResult = optionsRef.current?.onMutate?.(input);
      if (rollbackResult) {
        internals.rollback = rollbackResult;
      }

      internals.subscribable.set(pending);

      const effect = effectFnRef.current(input);
      const fiber = runtime.runFork(effect);
      internals.fiber = fiber;

      // Observe the result in a separate fiber.
      // If the mutation fiber is interrupted (by a new mutate/reset/unmount),
      // Fiber.await returns an Interrupt exit, and the guard below
      // prevents updating state from a stale fiber.
      const observeEffect = Effect.gen(function* () {
        const exit = yield* Fiber.await(fiber);
        // Only update if this fiber is still the current one
        if (internals.fiber !== fiber) {
          return;
        }
        internals.fiber = null;

        Exit.match(exit, {
          onFailure: (cause) => {
            // Automatic rollback on failure
            const rb = internals.rollback;
            internals.rollback = null;
            rb?.rollback();

            internals.subscribable.set(failure(cause));
            optionsRef.current?.onError?.(cause as Cause.Cause<E>, input);
          },
          onSuccess: (value) => {
            internals.rollback = null;
            internals.subscribable.set(success(value));
            optionsRef.current?.onSuccess?.(value, input);
          },
        });
      });

      runtime.runFork(observeEffect);
    },
    [runtime, internals],
  );

  const reset = useCallback((): void => {
    interruptFiber(runtime, internals);
    internals.rollback = null;
    internals.subscribable.set(initial);
  }, [runtime, internals]);

  const result = useSyncExternalStore(
    internals.subscribable.subscribe,
    internals.subscribable.getSnapshot,
  );

  return { result, mutate, reset };
};
