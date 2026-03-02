import { useMemo, useRef, useSyncExternalStore } from "react";
import type { Effect } from "effect";
import type { EffectResult } from "@effect-react/core";
import { createEffectObserver } from "@effect-react/core";
import { useEffectStore } from "./EffectProvider.js";

/**
 * React hook that executes an Effect and subscribes to its result.
 *
 * - Uses `useSyncExternalStore` to subscribe to an EffectObserver
 * - Returns `EffectResult<A, E>` (non-suspense: includes Initial and Pending states)
 * - Lazily triggers the Effect on first render (via EffectObserver)
 * - Re-executes when `key` changes
 * - Shares cache across components using the same key (via EffectStore)
 *
 * When modifying this hook:
 * - Update tests in `packages/react/tests/useEffectQuery.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 *
 * @param key - Unique cache key for the query
 * @param effect - The Effect to execute
 * @returns The current EffectResult state
 */
export const useEffectQuery = <A, E>(
  key: string,
  effect: Effect.Effect<A, E>,
): EffectResult<A, E> => {
  const store = useEffectStore();

  // Keep a stable reference to the effect to avoid re-creating the observer
  // on every render when the caller creates the effect inline.
  const effectRef = useRef(effect);
  effectRef.current = effect;

  // Create the observer, memoized by store + key.
  // When key changes, a new observer is created and the old one is unsubscribed
  // (via useSyncExternalStore's cleanup).
  const observer = useMemo(
    () => createEffectObserver<A, E>(store, key, effectRef.current),
    [store, key],
  );

  return useSyncExternalStore(observer.subscribe, observer.getSnapshot);
};
