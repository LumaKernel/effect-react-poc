import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Layer } from "effect";
import { ManagedRuntime } from "effect";

/**
 * Minimal interface for ManagedRuntime used by EffectProvider.
 * Avoids coupling to the full ManagedRuntime type while keeping runtime operations accessible.
 *
 * When modifying this interface:
 * - Update EffectProvider component
 * - Update tests in packages/react/tests/EffectProvider.test.tsx
 */
export interface EffectManagedRuntime<R, E> {
  readonly runFork: ManagedRuntime.ManagedRuntime<R, E>["runFork"];
  readonly runSync: ManagedRuntime.ManagedRuntime<R, E>["runSync"];
  readonly runPromise: ManagedRuntime.ManagedRuntime<R, E>["runPromise"];
  readonly dispose: ManagedRuntime.ManagedRuntime<R, E>["dispose"];
  readonly disposeEffect: ManagedRuntime.ManagedRuntime<R, E>["disposeEffect"];
}

const EffectRuntimeContext = createContext<EffectManagedRuntime<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> | null>(null);

/**
 * Retrieve the ManagedRuntime from the nearest EffectProvider.
 * Throws if used outside of an EffectProvider.
 */
export const useEffectRuntime = <R, E>(): EffectManagedRuntime<R, E> => {
  const runtime = useContext(EffectRuntimeContext);
  if (runtime === null) {
    throw new Error(
      "useEffectRuntime must be used within an EffectProvider. " +
        "Wrap your component tree with <EffectProvider layer={...}>.",
    );
  }
  // The context stores a type-erased runtime (any, any).
  // The caller specifies <R, E> to narrow the type.
  // This is safe because EffectProvider<R, E> stores ManagedRuntime<R, E>.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return runtime;
};

/**
 * Props for EffectProvider.
 *
 * When adding a new prop:
 * - Update EffectProvider implementation
 * - Update tests in packages/react/tests/EffectProvider.test.tsx
 */
export interface EffectProviderProps<R, E> {
  readonly layer: Layer.Layer<R, E>;
  readonly children: ReactNode;
}

/**
 * Provides a ManagedRuntime to the React component tree.
 *
 * - Creates a ManagedRuntime from the given Layer
 * - Disposes the runtime on unmount or when the layer reference changes
 * - Children can access the runtime via useEffectRuntime()
 */
export const EffectProvider = <R, E>({
  layer,
  children,
}: EffectProviderProps<R, E>): ReactNode => {
  const [runtime, setRuntime] = useState<EffectManagedRuntime<R, E> | null>(
    null,
  );
  useEffect(() => {
    const rt = ManagedRuntime.make(layer);
    setRuntime(rt);

    return () => {
      void rt.dispose();
    };
  }, [layer]);

  if (runtime === null) {
    return null;
  }

  return (
    <EffectRuntimeContext.Provider value={runtime}>
      {children}
    </EffectRuntimeContext.Provider>
  );
};
