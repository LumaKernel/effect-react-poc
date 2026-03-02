import { useSyncExternalStore } from "react";
import type { RetryState } from "@effect-react/core";
import { useEffectStore } from "@effect-react/react";

/**
 * Displays real-time retry progress for a given query key.
 *
 * Uses `store.getRetrySubscribable(key)` to subscribe to retry state changes.
 * Shows the current attempt number and whether a retry is in progress.
 *
 * Demonstrates: RetryState observation via getRetrySubscribable.
 */
export const RetryProgress = ({
  queryKey,
  maxRetries,
}: {
  readonly queryKey: string;
  readonly maxRetries: number;
}): React.ReactNode => {
  const store = useEffectStore();

  const retryState: RetryState = useSyncExternalStore(
    (callback) => store.getRetrySubscribable(queryKey).subscribe(callback),
    () => store.getRetrySubscribable(queryKey).getSnapshot(),
  );

  if (retryState.attempt === 0 && !retryState.retrying) {
    return null;
  }

  const progressWidth = Math.min((retryState.attempt / maxRetries) * 100, 100);

  return (
    <div
      style={{
        marginTop: "8px",
        padding: "8px 12px",
        background: retryState.retrying ? "#fef3c7" : "#f3f4f6",
        borderRadius: "6px",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span>{retryState.retrying ? "Retrying..." : "Retry complete"}</span>
        <span>
          Attempt {String(retryState.attempt) satisfies string} /{" "}
          {String(maxRetries) satisfies string}
        </span>
      </div>
      <div
        style={{
          height: "4px",
          background: "#e5e7eb",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${String(progressWidth) satisfies string}%`,
            background: retryState.retrying ? "#f59e0b" : "#10b981",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};
