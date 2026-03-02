import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Effect, Fiber, Stream } from "effect";
import { createSubscribable } from "@effect-react/core";
import { useEffectRuntime } from "@effect-react/react";
import type { PoolState, ConnectionError } from "./ConnectionPool.js";
import { ConnectionPool } from "./ConnectionPool.js";

/**
 * Custom hook that subscribes to the connection pool's state changes.
 *
 * Demonstrates:
 * - `useEffectRuntime<ConnectionPool, never>()` to get the typed runtime
 * - `Stream.runForEach` to consume the SubscriptionRef.changes stream
 * - `createSubscribable` + `useSyncExternalStore` for reactive state
 */
export const usePoolState = (): PoolState | null => {
  const runtime = useEffectRuntime<ConnectionPool, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<PoolState | null>(null);
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const pool = yield* ConnectionPool;
      yield* Stream.runForEach(pool.poolState, (state) =>
        Effect.sync(() => {
          internals.subscribable.set(state);
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
 * Custom hook that provides connection pool actions.
 *
 * Demonstrates:
 * - Using `runtime.runFork` to run Effects that require the ConnectionPool service
 * - `withConnection` pattern for safe resource usage
 */
export const usePoolActions = (): {
  readonly runQuery: (sql: string) => void;
  readonly queryResults: ReadonlyArray<string>;
} => {
  const runtime = useEffectRuntime<ConnectionPool, never>();

  const resultSubscribable = useMemo(
    () => createSubscribable<ReadonlyArray<string>>([]),
    [runtime],
  );

  const runQuery = useCallback(
    (sql: string) => {
      runtime.runFork(
        Effect.gen(function* () {
          const pool = yield* ConnectionPool;
          const result = yield* pool.withConnection((conn) => conn.query(sql));
          const current = resultSubscribable.getSnapshot();
          resultSubscribable.set([...current, result]);
        }).pipe(
          Effect.catchAll((error: ConnectionError) =>
            Effect.sync(() => {
              const current = resultSubscribable.getSnapshot();
              resultSubscribable.set([
                ...current,
                `Error: ${error.message satisfies string}`,
              ]);
            }),
          ),
        ),
      );
    },
    [runtime, resultSubscribable],
  );

  const queryResults = useSyncExternalStore(
    resultSubscribable.subscribe,
    resultSubscribable.getSnapshot,
  );

  return { runQuery, queryResults };
};
