import { useMemo, useRef, useSyncExternalStore } from "react";
import type { Effect, Schedule } from "effect";
import type { EffectResult } from "@effect-react/core";
import { createEffectObserver } from "@effect-react/core";
import { useEffectStore } from "./EffectProvider.js";

/**
 * Options for `useEffectQuery`.
 *
 * When adding a new option:
 * - Update tests in `packages/react/tests/useEffectQuery.test.tsx`
 */
export interface UseEffectQueryOptions<E> {
  /**
   * A Schedule policy for retrying the effect on failure.
   * Uses `Effect.retry(effect, schedule)` internally via EffectStore.
   */
  readonly schedule?: Schedule.Schedule<unknown, E>;

  /**
   * Tags for this query. Used for tag-based invalidation.
   * When a mutation with matching `invalidateTags` succeeds,
   * queries with these tags are automatically re-fetched.
   */
  readonly tags?: readonly string[];
}

/**
 * React hook that executes an Effect and subscribes to its result.
 *
 * - Uses `useSyncExternalStore` to subscribe to an EffectObserver
 * - Returns `EffectResult<A, E>` (non-suspense: includes Initial and Pending states)
 * - Lazily triggers the Effect on first render (via EffectObserver)
 * - Re-executes when `key` changes
 * - Shares cache across components using the same key (via EffectStore)
 * - Optionally accepts a schedule for retry policy
 *
 * When modifying this hook:
 * - Update tests in `packages/react/tests/useEffectQuery.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 *
 * @param key - Unique cache key for the query
 * @param effect - The Effect to execute
 * @param options - Optional configuration including retry schedule
 * @returns The current EffectResult state
 */
export const useEffectQuery = <A, E>(
  key: string,
  effect: Effect.Effect<A, E>,
  options?: UseEffectQueryOptions<E>,
): EffectResult<A, E> => {
  const store = useEffectStore();

  // Keep a stable reference to the effect to avoid re-creating the observer
  // on every render when the caller creates the effect inline.
  const effectRef = useRef(effect);
  effectRef.current = effect;

  // Keep a stable reference to the schedule
  const scheduleRef = useRef(options?.schedule);
  scheduleRef.current = options?.schedule;

  // Keep a stable reference to the tags
  const tagsRef = useRef(options?.tags);
  tagsRef.current = options?.tags;

  // Create the observer, memoized by store + key.
  // When key changes, a new observer is created and the old one is unsubscribed
  // (via useSyncExternalStore's cleanup).
  const observer = useMemo(() => {
    const schedule = scheduleRef.current;
    const tags = tagsRef.current;
    const observerOptions =
      schedule || tags
        ? {
            ...(schedule ? { schedule } : undefined),
            ...(tags ? { tags } : undefined),
          }
        : undefined;
    return createEffectObserver<A, E>(
      store,
      key,
      effectRef.current,
      observerOptions,
    );
  }, [store, key]);

  return useSyncExternalStore(observer.subscribe, observer.getSnapshot);
};
