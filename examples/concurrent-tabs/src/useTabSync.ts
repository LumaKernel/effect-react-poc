import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Effect, Fiber, Stream, SubscriptionRef } from "effect";
import { createSubscribable } from "@effect-react/core";
import { useEffectRuntime } from "@effect-react/react";
import { BroadcastService } from "./BroadcastService.js";

/**
 * Hook to get the current tab's ID.
 */
export const useTabId = (): string => {
  const runtime = useEffectRuntime<BroadcastService, never>();

  const tabId = useMemo(() => {
    let result = "unknown";
    runtime.runFork(
      Effect.gen(function* () {
        const service = yield* BroadcastService;
        result = service.tabId;
      }),
    );
    return result;
  }, [runtime]);

  return tabId;
};

/**
 * Hook to subscribe to the shared counter value across tabs.
 */
export const useSharedCounter = (): {
  readonly count: number;
  readonly increment: () => void;
  readonly decrement: () => void;
} => {
  const runtime = useEffectRuntime<BroadcastService, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<number>(0);
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const service = yield* BroadcastService;
      yield* Stream.runForEach(service.counter.changes, (value) =>
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

  const count = useSyncExternalStore(
    internals.subscribable.subscribe,
    internals.subscribable.getSnapshot,
  );

  const increment = useCallback(() => {
    runtime.runFork(
      Effect.gen(function* () {
        const service = yield* BroadcastService;
        const current = yield* SubscriptionRef.get(service.counter);
        const next = current + 1;
        yield* SubscriptionRef.set(service.counter, next);
        yield* service.send({ type: "counter-update", value: next });
      }),
    );
  }, [runtime]);

  const decrement = useCallback(() => {
    runtime.runFork(
      Effect.gen(function* () {
        const service = yield* BroadcastService;
        const current = yield* SubscriptionRef.get(service.counter);
        const next = current - 1;
        yield* SubscriptionRef.set(service.counter, next);
        yield* service.send({ type: "counter-update", value: next });
      }),
    );
  }, [runtime]);

  return { count, increment, decrement };
};

/**
 * Hook to subscribe to the leader election state.
 */
export const useLeader = (): string | null => {
  const runtime = useEffectRuntime<BroadcastService, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<string | null>(null);
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const service = yield* BroadcastService;
      yield* Stream.runForEach(service.leader.changes, (value) =>
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
