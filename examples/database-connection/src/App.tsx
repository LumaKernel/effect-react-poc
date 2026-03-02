import { EffectProvider } from "@effect-react/react";
import { makeConnectionPoolLive } from "./ConnectionPool.js";
import { PoolStatusDemo } from "./PoolStatusDemo.js";
import { TransactionDemo } from "./TransactionDemo.js";
import { LifecycleDemo } from "./LifecycleDemo.js";

/**
 * Application Layer: connection pool with 3 pre-created connections.
 */
const AppLayer = makeConnectionPoolLive(3);

/**
 * Database Connection Pool example.
 *
 * Demonstrates:
 * - Layer.scoped for tying resource lifecycle to the Provider
 * - Effect.acquireRelease for connection pool management
 * - SubscriptionRef for reactive pool state observation
 * - withConnection pattern for safe resource usage
 * - Component lifecycle independent of pool lifecycle
 */
export const App = (): React.ReactNode => (
  <div
    style={{
      maxWidth: 800,
      margin: "0 auto",
      padding: 24,
      fontFamily: "system-ui, sans-serif",
      color: "#eee",
      background: "#0d1117",
      minHeight: "100vh",
    }}
  >
    <h1>Database Connection Pool</h1>
    <p style={{ color: "#aaa", marginBottom: 32 }}>
      Demonstrates <code style={{ color: "#ff9f4a" }}>Layer.scoped</code> +{" "}
      <code style={{ color: "#ff9f4a" }}>Effect.acquireRelease</code> for
      managing a simulated database connection pool. The pool lifecycle is tied
      to the EffectProvider — connections are created on mount and automatically
      cleaned up on unmount.
    </p>

    <h2>1. Pool with Provider</h2>
    <p style={{ color: "#aaa", fontSize: 14 }}>
      A top-level EffectProvider creates and manages the connection pool.
    </p>
    <EffectProvider layer={AppLayer}>
      <PoolStatusDemo />
      <TransactionDemo />
    </EffectProvider>

    <h2 style={{ marginTop: 40 }}>2. Lifecycle Control</h2>
    <p style={{ color: "#aaa", fontSize: 14 }}>
      Mount/unmount a separate Provider to observe pool creation and
      destruction.
    </p>
    <LifecycleDemo />
  </div>
);
