import type { ReactNode } from "react";
import { Component, Suspense } from "react";
import type { Cause } from "effect";
import { EffectError } from "./useEffectSuspense.js";

/**
 * Props for EffectBoundary.
 *
 * When adding a new prop:
 * - Update EffectBoundary implementation
 * - Update tests in packages/react/tests/EffectBoundary.test.tsx
 * - Update re-exports in packages/react/src/index.ts
 */
export interface EffectBoundaryProps<E> {
  /** Content shown while children are suspended (loading). */
  readonly fallback: ReactNode;
  /**
   * Render function called when a child throws an EffectError.
   * Receives the typed Cause<E> for pattern matching.
   * If omitted, the EffectError propagates to a parent ErrorBoundary.
   */
  readonly renderError?: (cause: Cause.Cause<E>) => ReactNode;
  readonly children: ReactNode;
}

/**
 * Internal state for the error boundary portion.
 */
interface ErrorBoundaryState<E> {
  readonly effectCause: Cause.Cause<E> | null;
  readonly nonEffectError: unknown;
}

/**
 * Internal error boundary that catches EffectError and extracts Cause<E>.
 *
 * - If `renderError` is provided and the error is an EffectError, renders with the cause.
 * - If `renderError` is not provided, the error propagates to a parent ErrorBoundary.
 * - Non-EffectError errors always propagate to parent boundaries.
 */
class EffectErrorBoundary<E> extends Component<
  {
    readonly renderError: (cause: Cause.Cause<E>) => ReactNode;
    readonly children: ReactNode;
  },
  ErrorBoundaryState<E>
> {
  constructor(props: {
    readonly renderError: (cause: Cause.Cause<E>) => ReactNode;
    readonly children: ReactNode;
  }) {
    super(props);
    this.state = { effectCause: null, nonEffectError: null };
  }

  static getDerivedStateFromError(error: unknown) {
    if (error instanceof EffectError) {
      return { effectCause: error.cause, nonEffectError: null };
    }
    // Non-EffectError: store it so we can re-throw in render
    return { effectCause: null, nonEffectError: error };
  }

  override render() {
    // Re-throw non-EffectError so parent boundaries can handle them.
    // The error originates from React's getDerivedStateFromError and may be any type.
    if (this.state.nonEffectError !== null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw this.state.nonEffectError;
    }
    if (this.state.effectCause !== null) {
      return this.props.renderError(this.state.effectCause);
    }
    return this.props.children;
  }
}

/**
 * A convenience component that combines Suspense and ErrorBoundary for Effect-based UIs.
 *
 * - Wraps children in `<Suspense>` with the given `fallback`
 * - Optionally wraps in an error boundary that catches `EffectError<E>` and
 *   exposes `Cause<E>` for typed error rendering via `renderError`
 * - If `renderError` is omitted, errors propagate to a parent ErrorBoundary
 *
 * When modifying this component:
 * - Update tests in packages/react/tests/EffectBoundary.test.tsx
 * - Update re-exports in packages/react/src/index.ts
 */
export const EffectBoundary = <E,>({
  fallback,
  renderError,
  children,
}: EffectBoundaryProps<E>): ReactNode => {
  if (renderError === undefined) {
    return <Suspense fallback={fallback}>{children}</Suspense>;
  }

  return (
    <EffectErrorBoundary<E> renderError={renderError}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </EffectErrorBoundary>
  );
};
