import type { Effect, Schedule } from "effect";
import type { EffectResult } from "./EffectResult.js";
import { isInitial } from "./EffectResult.js";
import type { EffectStore, RunOptions } from "./EffectStore.js";
import type { Subscribable } from "./Subscribable.js";

/**
 * Options for `createEffectObserver`.
 *
 * When adding a new option:
 * - Update tests in `packages/core/tests/EffectObserver.test.ts`
 */
export interface EffectObserverOptions<E> {
  /**
   * A Schedule policy for retrying the effect on failure.
   * Passed through to `store.run(key, effect, { schedule })`.
   */
  readonly schedule?: Schedule.Schedule<unknown, E>;

  /**
   * Tags for this query entry. Used for tag-based invalidation.
   * Passed through to `store.run(key, effect, { tags })`.
   */
  readonly tags?: readonly string[];
}

/**
 * EffectObserver watches a single EffectStore entry with lazy acquisition.
 *
 * - The first subscribe triggers `store.run(key, effect)` (lazy)
 * - Subsequent subscribes do not re-execute if data is already cached
 * - Last unsubscribe delegates cleanup to the store's GC mechanism
 * - getSnapshot returns the current EffectResult for the key
 *
 * When modifying this module:
 * - Update tests in `packages/core/tests/EffectObserver.test.ts`
 * - Update re-exports in `packages/core/src/index.ts`
 */
export const createEffectObserver = <A, E>(
  store: EffectStore,
  key: string,
  effect: Effect.Effect<A, E>,
  options?: EffectObserverOptions<E>,
): Subscribable<EffectResult<A, E>> => {
  let subscriberCount = 0;

  const runOptions: RunOptions<E> | undefined =
    options?.schedule || options?.tags
      ? {
          ...(options.schedule ? { schedule: options.schedule } : undefined),
          ...(options.tags ? { tags: options.tags } : undefined),
        }
      : undefined;

  const subscribe = (callback: () => void): (() => void) => {
    subscriberCount++;

    // Subscribe to the store first so that the callback receives
    // all state transitions including the initial Pending notification.
    const storeUnsub = store.subscribe(key, callback);

    // Lazy acquisition: run the effect on first subscribe if no data cached
    if (subscriberCount === 1 && isInitial(store.getSnapshot(key))) {
      store.run(key, effect, runOptions);
    }

    let unsubscribed = false;
    return () => {
      if (unsubscribed) {
        return;
      }
      unsubscribed = true;
      subscriberCount--;
      storeUnsub();
    };
  };

  const getSnapshot = (): EffectResult<A, E> => store.getSnapshot<A, E>(key);

  return { subscribe, getSnapshot };
};
