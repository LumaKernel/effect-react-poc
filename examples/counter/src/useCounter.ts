import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Effect, Fiber, Stream } from "effect";
import { createSubscribable } from "@effect-react/core";
import { useEffectRuntime } from "@effect-react/react";
import { Counter } from "./CounterService.js";

/**
 * Custom hook that subscribes to the Counter's SubscriptionRef changes.
 *
 * Demonstrates:
 * - `useEffectRuntime<Counter, never>()` to get the typed runtime
 * - `runtime.runFork` to execute Effects that require Counter service
 * - `createSubscribable` + `useSyncExternalStore` for reactive state
 * - `Stream.runForEach` to consume the SubscriptionRef.changes stream
 */
export const useCounterValue = (): number | null => {
  const runtime = useEffectRuntime<Counter, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<number | null>(null);
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const counter = yield* Counter;
      yield* Stream.runForEach(counter.changes, (value) =>
        Effect.sync(() => {
          internals.subscribable.set(value);
        }),
      );
    });

    const fiber = runtime.runFork(consumeEffect);
    internals.fiber = fiber;

    return () => {
      if (internals.fiber !== null) {
        runtime.runFork(Fiber.interruptFork(internals.fiber));
        internals.fiber = null;
      }
    };
  }, [runtime, internals]);

  return useSyncExternalStore(
    internals.subscribable.subscribe,
    internals.subscribable.getSnapshot,
  );
};

/**
 * Custom hook that provides increment/decrement actions for the Counter service.
 *
 * Demonstrates:
 * - Using `runtime.runFork` to fire-and-forget Effect execution
 * - Accessing shared SubscriptionRef state through the Counter Layer
 */
export const useCounterActions = (): {
  readonly increment: () => void;
  readonly decrement: () => void;
} => {
  const runtime = useEffectRuntime<Counter, never>();

  const increment = useCallback(() => {
    runtime.runFork(
      Effect.gen(function* () {
        const counter = yield* Counter;
        yield* counter.increment;
      }),
    );
  }, [runtime]);

  const decrement = useCallback(() => {
    runtime.runFork(
      Effect.gen(function* () {
        const counter = yield* Counter;
        yield* counter.decrement;
      }),
    );
  }, [runtime]);

  return { increment, decrement };
};
