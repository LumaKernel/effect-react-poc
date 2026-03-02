import { Layer } from "effect";
import { EffectBoundary, EffectProvider } from "@effect-react/react";
import { QueryView } from "./QueryView.js";
import { SuspenseView } from "./SuspenseView.js";
import { ErrorView } from "./ErrorView.js";

/**
 * Data fetching example comparing two approaches:
 *
 * 1. useEffectQuery (non-suspense): Explicit state handling with matchEffectResult
 * 2. useEffectSuspense + EffectBoundary: Suspense-based with automatic loading/error UI
 *
 * Both use @effect/platform HttpClient for type-safe HTTP requests
 * with Schema validation on responses.
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <h1>effect-react Data Fetching</h1>

    <section>
      <h2>Approach 1: useEffectQuery</h2>
      <p>
        Uses <code>useEffectQuery</code> + <code>matchEffectResult</code> for
        explicit state handling. You control the UI for every state.
      </p>
      <QueryView />
    </section>

    <hr />

    <section>
      <h2>Approach 2: useEffectSuspense + EffectBoundary</h2>
      <p>
        Uses <code>useEffectSuspense</code> inside an{" "}
        <code>EffectBoundary</code>. Loading and error states are handled
        declaratively.
      </p>
      <EffectBoundary
        fallback={<p>Loading post...</p>}
        renderError={(cause) => (
          <p style={{ color: "red" }}>Error: {String(cause)}</p>
        )}
      >
        <SuspenseView />
      </EffectBoundary>
    </section>

    <hr />

    <section>
      <h2>Error Handling Demo</h2>
      <p>
        Fetches an invalid resource to demonstrate <code>EffectBoundary</code>{" "}
        error handling. The error is caught by the <code>renderError</code>{" "}
        prop.
      </p>
      <EffectBoundary
        fallback={<p>Loading...</p>}
        renderError={(cause) => (
          <div
            style={{ color: "red", border: "1px solid red", padding: "8px" }}
          >
            <strong>Caught by EffectBoundary:</strong>
            <p>{String(cause)}</p>
          </div>
        )}
      >
        <ErrorView />
      </EffectBoundary>
    </section>
  </EffectProvider>
);
