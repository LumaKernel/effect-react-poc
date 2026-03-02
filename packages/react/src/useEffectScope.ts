import { useCallback, useEffect, useRef } from "react";
import { Effect, Exit, Scope } from "effect";
import { useEffectRuntime } from "./EffectProvider.js";

/**
 * Result of `useEffectScope`.
 *
 * When modifying this interface:
 * - Update tests in `packages/react/tests/useEffectScope.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 */
export interface ScopeHandle {
  /**
   * Register a finalizer to run when the scope is closed (on unmount or runtime change).
   * Finalizers are executed in reverse registration order (LIFO).
   */
  readonly addFinalizer: (finalizer: Effect.Effect<void>) => void;
}

/**
 * React hook that provides an Effect.ts Scope tied to the component lifecycle.
 *
 * - Creates a new `Scope` on mount (in useEffect)
 * - Closes the scope (executing all finalizers) on unmount
 * - Provides `addFinalizer` to register cleanup effects
 * - Finalizers execute in LIFO order (last registered, first executed)
 *
 * Scope operations (make, addFinalizer, close) use `Effect.runSync` directly
 * because they are pure operations that don't require the managed runtime's
 * service context.
 *
 * When modifying this hook:
 * - Update tests in `packages/react/tests/useEffectScope.test.tsx`
 * - Update re-exports in `packages/react/src/index.ts`
 *
 * @returns ScopeHandle with addFinalizer function
 */
export const useEffectScope = (): ScopeHandle => {
  // useEffectRuntime ensures we're inside an EffectProvider
  useEffectRuntime();

  const scopeRef = useRef<Scope.CloseableScope | null>(null);

  useEffect(() => {
    const scope = Effect.runSync(Scope.make());
    scopeRef.current = scope;

    return () => {
      Effect.runSync(Scope.close(scope, Exit.void));
      scopeRef.current = null;
    };
  }, []);

  const addFinalizer = useCallback((finalizer: Effect.Effect<void>): void => {
    const scope = scopeRef.current;
    if (scope !== null) {
      Effect.runSync(Scope.addFinalizer(scope, finalizer));
    }
  }, []);

  return { addFinalizer };
};
