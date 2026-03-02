import type { Cause } from "effect";
import { Data } from "effect";

// --- Type Definitions ---

/**
 * EffectResult represents the state of an Effect execution.
 * Discriminated union with `_tag` for exhaustive pattern matching.
 *
 * When adding a new tag:
 * - Add the tag to this union type
 * - Add a constructor function below
 * - Update `matchEffectResult` type signature (compiler will enforce exhaustiveness)
 * - Update tests in `packages/core/tests/EffectResult.test.ts`
 */
export type EffectResult<A, E> =
  | Initial
  | Pending
  | Success<A>
  | Failure<E>
  | Refreshing<A>;

// --- Individual State Types ---

export interface Initial {
  readonly _tag: "Initial";
}

export interface Pending {
  readonly _tag: "Pending";
}

export interface Success<A> {
  readonly _tag: "Success";
  readonly value: A;
}

export interface Failure<E> {
  readonly _tag: "Failure";
  readonly cause: Cause.Cause<E>;
}

export interface Refreshing<A> {
  readonly _tag: "Refreshing";
  readonly value: A;
}

// --- Constructors (using Data.struct for structural equality) ---

export const initial: Initial = Data.struct({ _tag: "Initial" });

export const pending: Pending = Data.struct({ _tag: "Pending" });

export const success = <A>(value: A): Success<A> =>
  Data.struct({ _tag: "Success", value });

export const failure = <E>(cause: Cause.Cause<E>): Failure<E> =>
  Data.struct({ _tag: "Failure", cause });

export const refreshing = <A>(value: A): Refreshing<A> =>
  Data.struct({ _tag: "Refreshing", value });

// --- Type Guards ---

export const isInitial = <A, E>(result: EffectResult<A, E>) =>
  result._tag === "Initial";

export const isPending = <A, E>(result: EffectResult<A, E>) =>
  result._tag === "Pending";

export const isSuccess = <A, E>(result: EffectResult<A, E>) =>
  result._tag === "Success";

export const isFailure = <A, E>(result: EffectResult<A, E>) =>
  result._tag === "Failure";

export const isRefreshing = <A, E>(result: EffectResult<A, E>) =>
  result._tag === "Refreshing";

// --- Exhaustive Match Helper ---

/**
 * Exhaustive pattern matching on EffectResult.
 * The compiler enforces that all tags are handled.
 */
export const matchEffectResult = <A, E, R>(
  result: EffectResult<A, E>,
  handlers: {
    readonly Initial: (result: Initial) => R;
    readonly Pending: (result: Pending) => R;
    readonly Success: (result: Success<A>) => R;
    readonly Failure: (result: Failure<E>) => R;
    readonly Refreshing: (result: Refreshing<A>) => R;
  },
): R => {
  switch (result._tag) {
    case "Initial":
      return handlers.Initial(result);
    case "Pending":
      return handlers.Pending(result);
    case "Success":
      return handlers.Success(result);
    case "Failure":
      return handlers.Failure(result);
    case "Refreshing":
      return handlers.Refreshing(result);
  }
};

/**
 * Returns true if the result holds a value (Success or Refreshing).
 */
export const hasValue = <A, E>(result: EffectResult<A, E>) =>
  result._tag === "Success" || result._tag === "Refreshing";

/**
 * Extracts the value from a result that holds one (Success or Refreshing).
 * Returns undefined for other states.
 */
export const getValue = <A, E>(result: EffectResult<A, E>): A | undefined => {
  if (hasValue(result)) {
    return result.value;
  }
  return undefined;
};
