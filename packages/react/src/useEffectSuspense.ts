import { useMemo, useRef, useSyncExternalStore } from "react";
import type { Cause, Effect } from "effect";
import type { EffectResult } from "@effect-react/core";
import { createEffectObserver, initial } from "@effect-react/core";
import type { Subscribable } from "@effect-react/core";
import { useEffectStoreNullable } from "./EffectProvider.js";

/**
 * Error thrown by useEffectSuspense when the Effect fails.
 * Designed to be caught by an ErrorBoundary.
 *
 * When modifying this class:
 * - Update tests in `packages/react/tests/useEffectSuspense.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 */
export class EffectError<E> extends Error {
  readonly _tag = "EffectError" as const;
  override readonly cause: Cause.Cause<E>;

  constructor(cause: Cause.Cause<E>) {
    super("Effect execution failed");
    this.cause = cause;
  }
}

/**
 * Internal state for tracking the pending promise per observer.
 *
 * The promise is subscribed to the observer so that it resolves
 * even while the component is suspended (unmounted from the tree).
 */
interface SuspenseState<A, E> {
  promise: Promise<A> | null;
  observer: Subscribable<EffectResult<A, E>> | null;
}

/**
 * Create a Promise that resolves when the observer's snapshot transitions
 * to Success/Refreshing, or rejects (with EffectError) on Failure.
 *
 * This Promise self-subscribes to the observer, so it works even while
 * the component is suspended and not rendering.
 */
const createSuspensePromise = <A, E>(
  observer: Subscribable<EffectResult<A, E>>,
): Promise<A> =>
  new Promise<A>((resolve, reject) => {
    const unsub = observer.subscribe(() => {
      const snapshot = observer.getSnapshot();
      if (snapshot._tag === "Success" || snapshot._tag === "Refreshing") {
        unsub();
        resolve(snapshot.value);
      } else if (snapshot._tag === "Failure") {
        unsub();
        reject(new EffectError<E>(snapshot.cause));
      }
    });
  });

/**
 * Returns `initial` as the server snapshot for SSR.
 * Used as `getServerSnapshot` in `useSyncExternalStore`.
 */
const getServerSnapshot = (): EffectResult<never, never> => initial;

/* v8 ignore next 5 -- SSR-only: useSyncExternalStore does not call subscribe during renderToString */
const noop = (): void => {};

/** No-op subscribe for SSR (store not yet available). */
const noopSubscribe = (_callback: () => void): (() => void) => noop;

/**
 * React hook that executes an Effect with Suspense integration.
 *
 * - Uses `useSyncExternalStore` to subscribe to an EffectObserver
 * - Throws a cached Promise during Initial/Pending (triggers Suspense fallback)
 * - Throws an `EffectError<E>` during Failure (triggers ErrorBoundary)
 * - Returns the value `A` directly during Success/Refreshing
 * - SSR: returns `initial` via `getServerSnapshot`, triggering Suspense fallback on server
 *
 * The thrown Promise subscribes to the observer independently of React's
 * render cycle, ensuring it resolves even while the component is suspended.
 *
 * When modifying this hook:
 * - Update tests in `packages/react/tests/useEffectSuspense.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 *
 * @param key - Unique cache key for the query
 * @param effect - The Effect to execute
 * @returns The resolved value A
 */
export const useEffectSuspense = <A, E>(
  key: string,
  effect: Effect.Effect<A, E>,
): A => {
  const store = useEffectStoreNullable();

  const effectRef = useRef(effect);
  effectRef.current = effect;

  // During SSR (store === null), observer is null and getServerSnapshot handles it.
  const observer = useMemo(() => {
    if (store === null) {
      return null;
    }
    return createEffectObserver<A, E>(store, key, effectRef.current);
  }, [store, key]);

  const suspenseState = useRef<SuspenseState<A, E>>({
    promise: null,
    observer: null,
  });

  // Invalidate the cached promise when the observer changes (key change)
  if (suspenseState.current.observer !== observer) {
    suspenseState.current.promise = null;
    suspenseState.current.observer = observer;
  }

  const subscribe = observer?.subscribe ?? noopSubscribe;
  const getSnapshot = observer?.getSnapshot ?? getServerSnapshot;

  const result = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  switch (result._tag) {
    case "Initial":
    case "Pending": {
      if (suspenseState.current.promise === null && observer !== null) {
        suspenseState.current.promise = createSuspensePromise(observer);
      }
      if (suspenseState.current.promise !== null) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw suspenseState.current.promise;
      }
      // SSR path: observer is null, no promise to throw.
      // Return undefined cast as A — the Suspense boundary renders this output on server.
      return undefined as A;
    }
    case "Failure": {
      throw new EffectError<E>(result.cause);
    }
    case "Success": {
      // Clear the cached promise on success so a future suspension gets a fresh one
      suspenseState.current.promise = null;
      return result.value;
    }
    case "Refreshing": {
      return result.value;
    }
  }
};
