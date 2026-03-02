import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Layer as LayerType } from "effect";
import { Layer, ManagedRuntime } from "effect";
import type { EffectStore, EffectStoreConfig } from "@effect-react/core";
import { createEffectStore } from "@effect-react/core";

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

const EffectStoreContext = createContext<EffectStore | null>(null);

// Type-erased Layer context for nested Provider layer composition.
// The Layer is stored as Layer<any, any> and composed via Layer.merge at the child.
const EffectLayerContext = createContext<LayerType.Layer<
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
 * Retrieve the EffectStore from the nearest EffectProvider.
 * Throws if used outside of an EffectProvider.
 *
 * This is an internal hook used by useEffectQuery and other hooks.
 */
export const useEffectStore = (): EffectStore => {
  const store = useContext(EffectStoreContext);
  if (store === null) {
    throw new Error(
      "useEffectStore must be used within an EffectProvider. " +
        "Wrap your component tree with <EffectProvider layer={...}>.",
    );
  }
  return store;
};

/**
 * Props for EffectProvider.
 *
 * When adding a new prop:
 * - Update EffectProvider implementation
 * - Update tests in packages/react/tests/EffectProvider.test.tsx
 */
export interface EffectProviderProps<R, E> {
  readonly layer: LayerType.Layer<R, E>;
  readonly storeConfig?: Partial<EffectStoreConfig>;
  readonly children: ReactNode;
}

/**
 * Internal state holding both the runtime and its associated store.
 * When the runtime changes, the store is recreated.
 */
interface ProviderState<R, E> {
  readonly runtime: EffectManagedRuntime<R, E>;
  readonly store: EffectStore;
}

/**
 * Provides a ManagedRuntime and EffectStore to the React component tree.
 *
 * - Creates a ManagedRuntime from the given Layer
 * - Creates an EffectStore backed by the runtime
 * - Disposes the runtime and store on unmount or when the layer reference changes
 * - Children can access the runtime via useEffectRuntime()
 * - Children can access the store via useEffectStore()
 *
 * When nested inside another EffectProvider, the parent's Layer is automatically
 * merged with this provider's Layer via Layer.merge(parentLayer, childLayer).
 * The child's services take precedence (override) when there are conflicts.
 */
export const EffectProvider = <R, E>({
  layer,
  storeConfig,
  children,
}: EffectProviderProps<R, E>): ReactNode => {
  const parentLayer: LayerType.Layer<unknown, unknown> | null =
    useContext(EffectLayerContext);

  // Merge parent layer with this provider's layer.
  // Child layer takes precedence (is merged second, so it overrides parent services).
  const mergedLayer = useMemo(
    () => (parentLayer === null ? layer : Layer.merge(parentLayer, layer)),
    [parentLayer, layer],
  );

  const [state, setState] = useState<ProviderState<R, E> | null>(null);
  useEffect(() => {
    const rt = ManagedRuntime.make(mergedLayer);
    const store = createEffectStore(rt, storeConfig);
    setState({ runtime: rt, store });

    return () => {
      rt.runFork(store.dispose);
      void rt.dispose();
    };
  }, [mergedLayer, storeConfig]);

  // Window focus refetch: subscribe to visibilitychange and focus events
  useEffect(() => {
    if (!state) {
      return;
    }
    if (!storeConfig?.refetchOnWindowFocus) {
      return;
    }
    const handleFocus = (): void => {
      state.store.notifyFocus();
    };
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        state.store.notifyFocus();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state, storeConfig?.refetchOnWindowFocus]);

  if (state === null) {
    return null;
  }

  return (
    <EffectLayerContext.Provider value={mergedLayer}>
      <EffectRuntimeContext.Provider value={state.runtime}>
        <EffectStoreContext.Provider value={state.store}>
          {children}
        </EffectStoreContext.Provider>
      </EffectRuntimeContext.Provider>
    </EffectLayerContext.Provider>
  );
};
