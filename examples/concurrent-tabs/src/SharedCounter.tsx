import { useSharedCounter } from "./useTabSync.js";

/**
 * A counter that synchronizes across browser tabs via BroadcastChannel.
 *
 * Open multiple tabs to see the counter value sync in real time.
 */
export const SharedCounter = (): React.ReactNode => {
  const { count, increment, decrement } = useSharedCounter();

  return (
    <div
      style={{
        border: "1px solid #4a9eff",
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#4a9eff" }}>Shared Counter</h3>
      <p style={{ color: "#aaa", fontSize: 13 }}>
        This counter syncs across all open tabs. Open this page in another tab
        to see it work.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <button
          onClick={decrement}
          style={{
            padding: "8px 20px",
            background: "#ff4a4a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          -
        </button>
        <span
          style={{
            fontSize: 36,
            fontFamily: "monospace",
            fontWeight: "bold",
            color: "#eee",
            minWidth: 60,
            textAlign: "center",
          }}
        >
          {count}
        </span>
        <button
          onClick={increment}
          style={{
            padding: "8px 20px",
            background: "#4aff6e",
            color: "#000",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};
