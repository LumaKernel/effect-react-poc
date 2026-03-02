import type { ConnectionState } from "./message.js";
import { useConnectionState } from "./useChat.js";

const statusStyles: Record<
  ConnectionState,
  { readonly color: string; readonly label: string }
> = {
  connected: { color: "#4caf50", label: "Connected" },
  disconnected: { color: "#f44336", label: "Disconnected" },
  reconnecting: { color: "#ff9800", label: "Reconnecting..." },
};

/**
 * Displays the current WebSocket connection status.
 *
 * Demonstrates:
 * - Reactive connection state via `useConnectionState` hook
 * - Visual indicator that updates as connection state changes
 */
export const ConnectionStatus = (): React.ReactNode => {
  const state = useConnectionState();
  const style = statusStyles[state];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        borderRadius: "4px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: style.color,
        }}
      />
      <span>{style.label}</span>
    </div>
  );
};
