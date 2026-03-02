import { useState } from "react";
import { matchEffectResult } from "@effect-react/core";
import { useEffectQuery, useEffectStore } from "@effect-react/react";
import { fetchFromPrimaryApi, retrySchedule, resetCallCounts } from "./api.js";
import { RetryProgress } from "./RetryProgress.js";
import type { ApiError } from "./errors.js";

const QUERY_KEY = "retry-demo";
const MAX_RETRIES = 2;

/**
 * Demonstrates useEffectQuery with a retry schedule.
 *
 * - Fetches from a simulated unreliable API
 * - Automatically retries with exponential backoff (up to 2 retries)
 * - Shows real-time retry progress via RetryProgress component
 * - Manual retry button to re-trigger the query
 *
 * Demonstrates: Schedule option in useEffectQuery, manual invalidation.
 */
export const RetryDemo = (): React.ReactNode => {
  const [generation, setGeneration] = useState(0);
  const queryKey = `${QUERY_KEY satisfies string}-${String(generation) satisfies string}`;

  const result = useEffectQuery<string, ApiError>(
    queryKey,
    fetchFromPrimaryApi(),
    { schedule: retrySchedule },
  );

  const store = useEffectStore();

  const handleRetry = (): void => {
    store.invalidate(queryKey);
  };

  const handleReset = (): void => {
    resetCallCounts();
    setGeneration((prev) => prev + 1);
  };

  return (
    <div
      style={{
        padding: "12px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      {matchEffectResult(result, {
        Initial: () => <p style={{ color: "#9ca3af" }}>Waiting to start...</p>,
        Pending: () => (
          <p style={{ color: "#3b82f6" }}>Fetching from Primary API...</p>
        ),
        Success: ({ value }) => (
          <p style={{ color: "#10b981", fontWeight: "bold" }}>{value}</p>
        ),
        Failure: ({ cause }) => (
          <p style={{ color: "#ef4444" }}>
            Failed after retries: {cause.toString()}
          </p>
        ),
        Refreshing: ({ value }) => (
          <p style={{ color: "#6366f1" }}>Refreshing... (previous: {value})</p>
        ),
      })}

      <RetryProgress queryKey={queryKey} maxRetries={MAX_RETRIES} />

      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={handleRetry}
          style={{
            padding: "6px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Manual Retry
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: "6px 16px",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reset (New Key)
        </button>
      </div>
    </div>
  );
};
