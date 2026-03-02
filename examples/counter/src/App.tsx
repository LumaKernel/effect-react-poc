import { EffectProvider } from "@effect-react/react";
import { CounterLive } from "./CounterService.js";
import { CounterDisplay } from "./CounterDisplay.js";
import { CounterControls } from "./CounterControls.js";

export const App = (): React.ReactNode => (
  <EffectProvider layer={CounterLive}>
    <h1>effect-react Counter</h1>

    <section>
      <h2>Shared State via SubscriptionRef</h2>
      <p>
        Both displays subscribe to the same SubscriptionRef through a shared
        Layer. Changes are reflected in real-time across all subscribers.
      </p>
      <CounterDisplay label="Display A" />
      <CounterDisplay label="Display B" />
      <CounterControls />
    </section>
  </EffectProvider>
);
