import type { Scope } from "effect";
import { Effect, Exit, Fiber } from "effect";
import type { EffectResult } from "./EffectResult.js";
import {
  failure,
  initial,
  pending,
  refreshing,
  success,
} from "./EffectResult.js";
import type { MutableSubscribable, Subscribable } from "./Subscribable.js";
import { createSubscribable } from "./Subscribable.js";

/**
 * Configuration for EffectStore.
 *
 * When adding a new config option:
 * - Update `defaultEffectStoreConfig`
 * - Update tests in `packages/core/tests/EffectStore.test.ts`
 */
export interface EffectStoreConfig {
  /**
   * Grace period in milliseconds before an unsubscribed entry is garbage collected.
   * Set to 0 for immediate cleanup. Default: 30000 (30 seconds).
   */
  readonly gcGracePeriodMs: number;
}

const defaultEffectStoreConfig: EffectStoreConfig = {
  gcGracePeriodMs: 30_000,
};

/**
 * Internal entry tracking the state and fiber for a single cache key.
 * Type-erased internally; typed access is via the public API.
 */
interface StoreEntry {
  readonly subscribable: MutableSubscribable<EffectResult<unknown, unknown>>;
  fiber: Fiber.RuntimeFiber<unknown, unknown> | null;
  subscriberCount: number;
  gcTimer: ReturnType<typeof setTimeout> | null;
  effect: Effect.Effect<unknown, unknown> | null;
}

/**
 * EffectStore manages Effect execution results keyed by string.
 *
 * - Each key maps to an EffectResult<A, E> managed by a MutableSubscribable
 * - Effects are executed via a provided runtime
 * - Fibers are tracked per key and interrupted on re-run, invalidation, or dispose
 * - GC with configurable grace period cleans up entries after last unsubscribe
 *
 * When modifying this interface:
 * - Update `createEffectStore` implementation
 * - Update tests in `packages/core/tests/EffectStore.test.ts`
 * - Update re-exports in `packages/core/src/index.ts`
 */
export interface EffectStore {
  /**
   * Get a Subscribable view of the result for a given key.
   * Returns a Subscribable<EffectResult<A, E>> that always starts with `initial`.
   */
  readonly getSubscribable: <A, E>(
    key: string,
  ) => Subscribable<EffectResult<A, E>>;

  /**
   * Run an effect and cache its result under the given key.
   * If an effect is already running for this key, the previous fiber is interrupted.
   * If the entry already has a successful value, transitions through Refreshing state.
   */
  readonly run: <A, E>(key: string, effect: Effect.Effect<A, E>) => void;

  /**
   * Re-run the last effect for the given key.
   * No-op if no effect has been run for this key.
   */
  readonly invalidate: (key: string) => void;

  /**
   * Subscribe to changes for a key.
   * While subscribed, the entry will not be garbage collected.
   * Returns an unsubscribe function.
   */
  readonly subscribe: (key: string, callback: () => void) => () => void;

  /**
   * Get the current snapshot for a key.
   */
  readonly getSnapshot: <A, E>(key: string) => EffectResult<A, E>;

  /**
   * Dispose the store: interrupt all running fibers and clear all entries.
   * Returns an Effect that completes when all fibers have been interrupted.
   */
  readonly dispose: Effect.Effect<void>;
}

/**
 * Minimal runtime interface needed by EffectStore.
 * Compatible with ManagedRuntime<R, E> (where E is the layer error).
 *
 * The fiber error type is `unknown` because:
 * - ManagedRuntime<R, LayerE>.runFork<A, EffE> returns RuntimeFiber<A, EffE | LayerE>
 * - The store internally erases types (stores Fiber<unknown, unknown>)
 * - The store only uses Fiber.await and Fiber.interruptFork, both of which work with any error type
 *
 * When modifying this interface:
 * - Update createEffectStore
 * - Update EffectProvider's createStoreRuntimeDelegate
 * - Update tests in packages/core/tests/EffectStore.test.ts
 */
export interface StoreRuntime {
  readonly runFork: <A, E>(
    effect: Effect.Effect<A, E>,
    options?: { readonly scope?: Scope.Scope },
  ) => Fiber.RuntimeFiber<A, unknown>;
}

/**
 * Create an EffectStore with the given runtime and optional configuration.
 *
 * The runtime is used to fork effects. The runtime's context must satisfy
 * the requirements of any effects that will be run through this store.
 */
export const createEffectStore = (
  runtime: StoreRuntime,
  config?: Partial<EffectStoreConfig>,
): EffectStore => {
  const resolvedConfig: EffectStoreConfig = {
    ...defaultEffectStoreConfig,
    ...config,
  };

  const entries = new Map<string, StoreEntry>();
  let disposed = false;

  const getOrCreateEntry = (key: string): StoreEntry => {
    const existing = entries.get(key);
    if (existing) {
      return existing;
    }
    const entry: StoreEntry = {
      subscribable: createSubscribable<EffectResult<unknown, unknown>>(initial),
      fiber: null,
      subscriberCount: 0,
      gcTimer: null,
      effect: null,
    };
    entries.set(key, entry);
    return entry;
  };

  const cancelGcTimer = (entry: StoreEntry): void => {
    if (entry.gcTimer !== null) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = null;
    }
  };

  const scheduleGc = (key: string, entry: StoreEntry): void => {
    cancelGcTimer(entry);
    if (resolvedConfig.gcGracePeriodMs <= 0) {
      cleanupEntry(key, entry);
      return;
    }
    entry.gcTimer = setTimeout(() => {
      cleanupEntry(key, entry);
    }, resolvedConfig.gcGracePeriodMs);
  };

  const cleanupEntry = (key: string, entry: StoreEntry): void => {
    cancelGcTimer(entry);
    if (entry.fiber !== null) {
      runtime.runFork(Fiber.interruptFork(entry.fiber));
      entry.fiber = null;
    }
    entry.subscribable.set(initial);
    entry.effect = null;
    entries.delete(key);
  };

  const interruptFiber = (entry: StoreEntry): void => {
    if (entry.fiber !== null) {
      runtime.runFork(Fiber.interruptFork(entry.fiber));
      entry.fiber = null;
    }
  };

  const runEffect = (
    key: string,
    effect: Effect.Effect<unknown, unknown>,
  ): void => {
    if (disposed) {
      return;
    }

    const entry = getOrCreateEntry(key);
    entry.effect = effect;

    // Interrupt any existing fiber for this key
    interruptFiber(entry);

    // Determine the transitional state
    const currentResult = entry.subscribable.getSnapshot();
    if (
      currentResult._tag === "Success" ||
      currentResult._tag === "Refreshing"
    ) {
      entry.subscribable.set(refreshing(currentResult.value));
    } else {
      entry.subscribable.set(pending);
    }

    // Fork the effect
    const fiber = runtime.runFork(effect);
    entry.fiber = fiber;

    // Observe the fiber result in a separate fiber
    const observeEffect = Effect.gen(function* () {
      const exit = yield* Fiber.await(fiber);
      // Only update if this fiber is still the current one for the key
      const currentEntry = entries.get(key);
      if (currentEntry?.fiber !== fiber) {
        return;
      }
      currentEntry.fiber = null;

      Exit.match(exit, {
        onFailure: (cause) => {
          currentEntry.subscribable.set(failure(cause));
        },
        onSuccess: (value) => {
          currentEntry.subscribable.set(success(value));
        },
      });
    });

    runtime.runFork(observeEffect);
  };

  const store: EffectStore = {
    getSubscribable: <A, E>(key: string): Subscribable<EffectResult<A, E>> => {
      const entry = getOrCreateEntry(key);
      // Wrap to project the type-erased internal subscribable to typed external view.
      // This is safe because run<A, E> stores Effect<A, E> under the same key.
      return {
        subscribe: entry.subscribable.subscribe,
        getSnapshot: () =>
          entry.subscribable.getSnapshot() as EffectResult<A, E>,
      };
    },

    run: <A, E>(key: string, effect: Effect.Effect<A, E>): void => {
      runEffect(key, effect);
    },

    invalidate: (key: string): void => {
      const entry = entries.get(key);
      if (!entry?.effect) {
        return;
      }
      runEffect(key, entry.effect);
    },

    subscribe: (key: string, callback: () => void): (() => void) => {
      const entry = getOrCreateEntry(key);
      cancelGcTimer(entry);
      entry.subscriberCount++;
      const unsub = entry.subscribable.subscribe(callback);

      let unsubscribed = false;
      return () => {
        if (unsubscribed) {
          return;
        }
        unsubscribed = true;
        unsub();
        entry.subscriberCount--;
        if (entry.subscriberCount <= 0) {
          scheduleGc(key, entry);
        }
      };
    },

    getSnapshot: <A, E>(key: string): EffectResult<A, E> => {
      const entry = entries.get(key);
      if (!entry) {
        return initial as EffectResult<A, E>;
      }
      return entry.subscribable.getSnapshot() as EffectResult<A, E>;
    },

    dispose: Effect.gen(function* () {
      disposed = true;
      const fibers = [...entries.values()]
        .map((e) => e.fiber)
        .filter((f) => f !== null);

      for (const entry of entries.values()) {
        cancelGcTimer(entry);
        entry.fiber = null;
      }
      entries.clear();

      for (const fiber of fibers) {
        yield* Fiber.interrupt(fiber);
      }
    }),
  };

  return store;
};
