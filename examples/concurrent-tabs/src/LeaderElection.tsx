import { useLeader, useTabId } from "./useTabSync.js";

/**
 * Displays the leader election status.
 *
 * When multiple tabs are open, one tab will be elected as the leader.
 * The leader election uses a simple claim-based protocol over BroadcastChannel.
 */
export const LeaderElection = (): React.ReactNode => {
  const tabId = useTabId();
  const leader = useLeader();

  const isLeader = leader === tabId;
  const statusColor = isLeader
    ? "#4aff6e"
    : leader !== null
      ? "#ff9f4a"
      : "#888";
  const statusText =
    leader === null
      ? "Electing..."
      : isLeader
        ? "This tab is the LEADER"
        : `Following leader: ${leader satisfies string}`;

  return (
    <div
      style={{
        border: `1px solid ${statusColor satisfies string}`,
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <h3 style={{ marginTop: 0, color: statusColor }}>Leader Election</h3>
      <p style={{ color: "#aaa", fontSize: 13 }}>
        Each tab participates in leader election. The first tab to claim
        leadership wins. Open multiple tabs to see different roles.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: statusColor,
            boxShadow: isLeader
              ? `0 0 8px ${statusColor satisfies string}`
              : "none",
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: "bold",
            color: statusColor,
          }}
        >
          {statusText}
        </span>
      </div>

      {isLeader && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: "#1a2a1a",
            borderRadius: 6,
            color: "#4aff6e",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          Leader responsibilities: coordinate state, handle timeouts, manage
          resources.
        </div>
      )}
    </div>
  );
};
