import { Layer } from "effect";
import { EffectBoundary, EffectProvider } from "@effect-react/react";
import { ErrorDisplay } from "./ErrorDisplay.js";
import { QueryDemo } from "./QueryDemo.js";
import { CatchTagDemo } from "./CatchTagDemo.js";
import { BoundaryDemo } from "./BoundaryDemo.js";

/**
 * Typed Errors example demonstrating Effect.ts error handling patterns:
 *
 * 1. **Error Type Definitions**: Multiple Data.TaggedError types forming a discriminated union
 * 2. **Cause Pattern Matching**: Using Cause.match for exhaustive error handling in UI
 * 3. **Effect.catchTag**: Selective error recovery (convert specific errors to fallback values)
 * 4. **EffectBoundary + Cause<E>**: Suspense-based error display with typed causes
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <h1>effect-react Typed Errors</h1>

    <section>
      <h2>1. useEffectQuery + Cause Pattern Matching</h2>
      <p>
        Uses <code>useEffectQuery</code> + <code>matchEffectResult</code> to
        handle all states. On failure, <code>Cause.match</code> renders
        color-coded error UI for each error type:{" "}
        <span style={{ color: "#ef4444" }}>NetworkError</span>,{" "}
        <span style={{ color: "#f59e0b" }}>ValidationError</span>,{" "}
        <span style={{ color: "#6366f1" }}>NotFoundError</span>,{" "}
        <span style={{ color: "#ec4899" }}>TimeoutError</span>.
      </p>
      <QueryDemo />
    </section>

    <hr />

    <section>
      <h2>2. Effect.catchTag (Selective Recovery)</h2>
      <p>
        Uses <code>Effect.catchTag(&quot;NotFoundError&quot;, ...)</code> to
        convert <code>NotFoundError</code> into a fallback value. Other errors (
        <code>NetworkError</code>, <code>TimeoutError</code>) still propagate as
        failures. Notice the narrowed error type in the Failure handler.
      </p>
      <CatchTagDemo />
    </section>

    <hr />

    <section>
      <h2>3. EffectBoundary + Cause&lt;E&gt;</h2>
      <p>
        Uses <code>useEffectSuspense</code> inside an{" "}
        <code>EffectBoundary</code>. When the effect fails, the boundary catches
        the error and passes <code>Cause&lt;AppError&gt;</code> to{" "}
        <code>renderError</code>, where <code>ErrorDisplay</code> renders the
        typed error.
      </p>
      <EffectBoundary
        fallback={<p style={{ color: "#3b82f6" }}>Loading user profile...</p>}
        renderError={(cause) => <ErrorDisplay cause={cause} />}
      >
        <BoundaryDemo />
      </EffectBoundary>
    </section>
  </EffectProvider>
);
