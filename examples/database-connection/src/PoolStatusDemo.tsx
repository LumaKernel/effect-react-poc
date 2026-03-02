import { usePoolState } from "./useConnectionPool.js";

/**
 * Displays real-time connection pool status.
 *
 * Subscribes to the pool's SubscriptionRef via Stream and shows:
 * - Total / Active / Idle connection counts with color indicators
 * - Pool activity logs with timestamps
 */
export const PoolStatusDemo = (): React.ReactNode => {
  const state = usePoolState();

  return (
    <div
      style={{
        border: "1px solid #4a9eff",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#4a9eff" }}>Connection Pool Status</h3>
      <p style={{ color: "#aaa", fontSize: 14 }}>
        Real-time pool state tracked via SubscriptionRef. The pool is created
        with <code style={{ color: "#ff9f4a" }}>Layer.scoped</code>, tying its
        lifecycle to the EffectProvider.
      </p>

      {state === null ? (
        <p style={{ color: "#888" }}>Initializing pool...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatBox
              label="Total"
              value={state.totalConnections}
              color="#4a9eff"
            />
            <StatBox
              label="Active"
              value={state.activeConnections}
              color="#ff9f4a"
            />
            <StatBox
              label="Idle"
              value={state.idleConnections}
              color="#4aff6e"
            />
          </div>
          <div
            style={{
              background: "#1a1a2e",
              padding: 12,
              borderRadius: 4,
              maxHeight: 200,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            {state.logs.length === 0 ? (
              <p style={{ color: "#666", margin: 0 }}>No activity yet</p>
            ) : (
              state.logs.map((log, i) => (
                <div key={i} style={{ color: "#0f0", marginBottom: 2 }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </>
      )}
      <p style={{ fontSize: 12, color: "#888", marginBottom: 0 }}>
        When the Provider unmounts, Effect.acquireRelease ensures all
        connections are closed in the release phase.
      </p>
    </div>
  );
};

const StatBox = ({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}): React.ReactNode => (
  <div
    style={{
      background: "#1a1a2e",
      padding: 12,
      borderRadius: 4,
      textAlign: "center",
      border: `1px solid ${color satisfies string}`,
    }}
  >
    <div
      style={{
        fontSize: 24,
        fontWeight: "bold",
        color,
        fontFamily: "monospace",
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{label}</div>
  </div>
);
