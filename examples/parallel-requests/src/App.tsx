import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { ParallelFetch } from "./ParallelFetch.js";
import { AllSettled } from "./AllSettled.js";
import { RaceDemo } from "./RaceDemo.js";
import { SemaphoreDemo } from "./SemaphoreDemo.js";

/**
 * Parallel Requests example demonstrating Effect.ts concurrency primitives:
 *
 * 1. Effect.all { concurrency: "unbounded" } — run all in parallel
 * 2. Effect.all { mode: "either" } — collect successes and failures
 * 3. Effect.raceAll — first response wins, others interrupted
 * 4. Effect.makeSemaphore — limit concurrent executions
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
    <h1>effect-react Parallel Requests</h1>

    <section>
      <ParallelFetch />
    </section>

    <hr />

    <section>
      <AllSettled />
    </section>

    <hr />

    <section>
      <RaceDemo />
    </section>

    <hr />

    <section>
      <SemaphoreDemo />
    </section>
  </EffectProvider>
);
