import { EffectProvider } from "@effect-react/react";
import { BroadcastServiceLive } from "./BroadcastService.js";
import { SharedCounter } from "./SharedCounter.js";
import { LeaderElection } from "./LeaderElection.js";
import { useTabId } from "./useTabSync.js";

/**
 * Demonstrates cross-tab communication using BroadcastChannel with Effect.
 *
 * Features:
 * - BroadcastChannel wrapped as Stream.async for reactive message handling
 * - Shared counter state synchronized across all open tabs
 * - Leader election using claim-based protocol
 * - SubscriptionRef for reactive state management
 *
 * Open this page in multiple browser tabs to see the synchronization in action.
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={BroadcastServiceLive}>
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        background: "#1a1a2e",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#fff", marginBottom: 4 }}>Concurrent Tabs</h1>
      <p style={{ color: "#aaa", marginTop: 0, fontSize: 14 }}>
        Cross-tab synchronization via BroadcastChannel + Effect Stream. Open
        this page in multiple tabs to see it work.
      </p>
      <TabInfo />
      <SharedCounter />
      <LeaderElection />
    </div>
  </EffectProvider>
);

const TabInfo = (): React.ReactNode => {
  const tabId = useTabId();

  return (
    <div
      style={{
        padding: 10,
        background: "#2a2a3e",
        borderRadius: 6,
        marginBottom: 16,
        fontFamily: "monospace",
        fontSize: 13,
        color: "#aaa",
      }}
    >
      Tab ID: <span style={{ color: "#4a9eff" }}>{tabId}</span>
    </div>
  );
};
