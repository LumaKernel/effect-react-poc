import type { ReactNode } from "react";
import { memo, useRef } from "react";
import type { Effect } from "effect";
import type { EffectResult } from "@effect-react/core";
import { useEffectQuery } from "./useEffectQuery.js";

/**
 * Props for the EffectValue component.
 *
 * When adding a new prop:
 * - Update EffectValue implementation
 * - Update tests in packages/react/tests/EffectValue.test.tsx
 * - Update re-exports in packages/react/src/index.ts
 */
export interface EffectValueProps<A, E> {
  /** Unique cache key for the query (shared with EffectStore). */
  readonly queryKey: string;
  /** The Effect to execute and subscribe to. */
  readonly effect: Effect.Effect<A, E>;
  /** Render function called with the current EffectResult. */
  readonly children: (result: EffectResult<A, E>) => ReactNode;
}

/**
 * Props for the memoized inner component.
 * All mutable values (effect, children) are passed via refs to keep the
 * props identity stable across parent re-renders.
 */
interface EffectValueInnerProps<A, E> {
  readonly queryKey: string;
  readonly effectRef: Readonly<{ current: Effect.Effect<A, E> }>;
  readonly childrenRef: Readonly<{
    current: (result: EffectResult<A, E>) => ReactNode;
  }>;
}

/**
 * Inner component that holds the subscription.
 *
 * Wrapped in React.memo so that parent re-renders do NOT propagate
 * into this subtree. The memo boundary only breaks when `queryKey` changes.
 * `effectRef` and `childrenRef` are stable ref objects whose identity
 * does not change, so they never trigger a re-render through memo.
 *
 * Only internal state changes from `useSyncExternalStore` (via `useEffectQuery`)
 * trigger a re-render here.
 */
const EffectValueInner = memo(
  <A, E>({
    queryKey,
    effectRef,
    childrenRef,
  }: EffectValueInnerProps<A, E>): ReactNode => {
    const result = useEffectQuery<A, E>(queryKey, effectRef.current);
    return childrenRef.current(result);
  },
) as <A, E>(props: EffectValueInnerProps<A, E>) => ReactNode;

/**
 * A fine-grained reactivity component inspired by Legend State's `<Memo>`.
 *
 * Isolates an Effect subscription from parent re-renders:
 * - The parent component does NOT re-render when the Effect result changes
 * - Only the EffectValue subtree re-renders on state changes
 * - Shares the EffectStore cache via `queryKey` (same key = same cache entry)
 *
 * Both `effect` and `children` are stored in refs so that new references
 * on each parent render do NOT break the inner memo boundary. Only a
 * `queryKey` change causes the inner component to re-render from props.
 *
 * Uses `useEffectQuery` internally, so it requires an `<EffectProvider>` ancestor.
 *
 * When modifying this component:
 * - Update tests in packages/react/tests/EffectValue.test.tsx
 * - Update re-exports in packages/react/src/index.ts
 */
export const EffectValue = <A, E>({
  queryKey,
  effect,
  children,
}: EffectValueProps<A, E>): ReactNode => {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  const childrenRef = useRef(children);
  childrenRef.current = children;

  return (
    <EffectValueInner
      queryKey={queryKey}
      effectRef={effectRef}
      childrenRef={childrenRef}
    />
  );
};
