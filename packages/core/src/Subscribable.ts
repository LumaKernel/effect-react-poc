/**
 * Subscribable interface compatible with React's `useSyncExternalStore`.
 *
 * When modifying this interface:
 * - Update `createSubscribable` implementation below
 * - Update tests in `packages/core/tests/Subscribable.test.ts`
 * - Update re-exports in `packages/core/src/index.ts`
 */
export interface Subscribable<A> {
  readonly subscribe: (callback: () => void) => () => void;
  readonly getSnapshot: () => A;
}

/**
 * Mutable extension of Subscribable that allows setting new values.
 * Used internally; consumers only see the Subscribable interface.
 */
export interface MutableSubscribable<A> extends Subscribable<A> {
  readonly set: (value: A) => void;
}

/**
 * Creates a MutableSubscribable with reference equality checks.
 *
 * - `getSnapshot` always returns the same reference if the value hasn't changed
 * - `set` uses `Object.is` to skip updates when the value is referentially equal
 * - Subscribers are notified only when the value actually changes
 */
export const createSubscribable = <A>(
  initialValue: A,
): MutableSubscribable<A> => {
  let current: A = initialValue;
  const listeners = new Set<() => void>();

  const subscribe = (callback: () => void): (() => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  };

  const getSnapshot = (): A => current;

  const set = (value: A): void => {
    if (Object.is(current, value)) {
      return;
    }
    current = value;
    for (const listener of listeners) {
      listener();
    }
  };

  return { subscribe, getSnapshot, set };
};
