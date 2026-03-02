import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { RetryDemo } from "./RetryDemo.js";
import { FallbackChainDemo } from "./FallbackChainDemo.js";
import { ScheduleCompositionDemo } from "./ScheduleCompositionDemo.js";

/**
 * Retry with Fallback example demonstrating Effect.ts retry patterns:
 *
 * 1. **Retry with Progress**: useEffectQuery + Schedule option + RetryState visualization
 * 2. **Fallback Chain**: Primary API → Fallback API → Local Cache via Effect.catchAll
 * 3. **Schedule Composition**: Different Schedule primitives (recurs, exponential, spaced)
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <h1>effect-react Retry with Fallback</h1>

    <section>
      <h2>1. Retry with Progress Visualization</h2>
      <p>
        Uses <code>useEffectQuery</code> with a{" "}
        <code>Schedule.intersect(exponential, recurs)</code> retry strategy. The{" "}
        <code>RetryProgress</code> component subscribes to{" "}
        <code>store.getRetrySubscribable(key)</code> for real-time retry
        progress. Click <b>Manual Retry</b> to re-trigger via{" "}
        <code>store.invalidate(key)</code>.
      </p>
      <RetryDemo />
    </section>

    <hr />

    <section>
      <h2>2. Fallback Chain (3-tier)</h2>
      <p>
        Chains <code>Effect.retry(schedule)</code> +{" "}
        <code>Effect.catchAll</code> to create a tiered fallback: Primary API (3
        attempts) → Fallback API (3 attempts) → Local Cache. The chain is
        composed as a single <code>Effect</code>, so the entire fallback logic
        is handled before returning a result.
      </p>
      <FallbackChainDemo />
    </section>

    <hr />

    <section>
      <h2>3. Schedule Composition Comparison</h2>
      <p>
        Compares different <code>Schedule</code> compositions side by side. Each
        card uses a different retry strategy with the same always-failing
        effect. Observe how different schedules affect retry timing and attempt
        counts.
      </p>
      <ScheduleCompositionDemo />
    </section>
  </EffectProvider>
);
