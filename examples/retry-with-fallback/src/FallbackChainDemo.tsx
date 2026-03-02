import { useState } from "react";
import { matchEffectResult } from "@effect-react/core";
import { useEffectQuery } from "@effect-react/react";
import { fetchWithFallbackChain, resetCallCounts } from "./api.js";

const QUERY_KEY = "fallback-chain";

/**
 * Demonstrates the 3-tier fallback chain:
 * Primary API (retries) → Fallback API (retries) → Local Cache
 *
 * The chain uses Effect.catchAll to fall through to the next tier
 * when retries are exhausted. The final fallback (local cache) always succeeds.
 *
 * Demonstrates: Effect.catchAll chaining, Schedule.compose, graceful degradation.
 */
export const FallbackChainDemo = (): React.ReactNode => {
  const [generation, setGeneration] = useState(0);
  const queryKey = `${QUERY_KEY satisfies string}-${String(generation) satisfies string}`;

  const result = useEffectQuery<string, never>(
    queryKey,
    fetchWithFallbackChain(),
  );

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
      <div style={{ marginBottom: "8px", fontSize: "13px", color: "#6b7280" }}>
        Chain: Primary API (3 attempts) → Fallback API (3 attempts) → Local
        Cache
      </div>

      {matchEffectResult(result, {
        Initial: () => <p style={{ color: "#9ca3af" }}>Waiting to start...</p>,
        Pending: () => (
          <div>
            <p style={{ color: "#3b82f6" }}>Executing fallback chain...</p>
            <FallbackSteps />
          </div>
        ),
        Success: ({ value }) => {
          const isCache = value.startsWith("[Cached]");
          const isFallback = value.startsWith("Data from Fallback");
          return (
            <div>
              <p
                style={{
                  color: isCache
                    ? "#f59e0b"
                    : isFallback
                      ? "#8b5cf6"
                      : "#10b981",
                  fontWeight: "bold",
                }}
              >
                {value}
              </p>
              <p
                style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}
              >
                {isCache
                  ? "All APIs failed. Served from local cache."
                  : isFallback
                    ? "Primary API failed. Served from fallback API."
                    : "Primary API succeeded."}
              </p>
            </div>
          );
        },
        Failure: ({ cause }) => (
          <p style={{ color: "#ef4444" }}>
            Unexpected failure: {cause.toString()}
          </p>
        ),
        Refreshing: ({ value }) => (
          <p style={{ color: "#6366f1" }}>Refreshing... (previous: {value})</p>
        ),
      })}

      <div style={{ marginTop: "12px" }}>
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
          Reset & Re-run
        </button>
      </div>
    </div>
  );
};

/**
 * Visual representation of the fallback chain steps.
 */
const FallbackSteps = (): React.ReactNode => (
  <div
    style={{
      display: "flex",
      gap: "8px",
      alignItems: "center",
      marginTop: "8px",
    }}
  >
    {[
      { label: "Primary API", color: "#3b82f6" },
      { label: "Fallback API", color: "#8b5cf6" },
      { label: "Local Cache", color: "#f59e0b" },
    ].map((step) => (
      <div
        key={step.label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: step.color,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: "12px", color: step.color }}>
          {step.label}
        </span>
      </div>
    ))}
  </div>
);
