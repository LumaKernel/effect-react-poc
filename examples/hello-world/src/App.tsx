import { Suspense } from "react";
import { Layer } from "effect";
import { EffectBoundary, EffectProvider } from "@effect-react/react";
import { QueryExample } from "./QueryExample.js";
import { SuspenseExample } from "./SuspenseExample.js";

/**
 * Minimal hello-world example showing:
 * 1. EffectProvider with Layer.empty (no services needed)
 * 2. useEffectQuery - non-suspense query
 * 3. useEffectSuspense + EffectBoundary - suspense-based query
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <h1>effect-react Hello World</h1>

    <section>
      <h2>useEffectQuery (non-suspense)</h2>
      <QueryExample />
    </section>

    <section>
      <h2>useEffectSuspense + EffectBoundary</h2>
      <EffectBoundary fallback={<p>Loading...</p>}>
        <Suspense fallback={<p>Suspense fallback...</p>}>
          <SuspenseExample />
        </Suspense>
      </EffectBoundary>
    </section>
  </EffectProvider>
);
