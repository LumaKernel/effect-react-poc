import { matchEffectResult } from "@effect-react/core";
import { useEffectQuery } from "@effect-react/react";
import { fetchUserProfile } from "./api.js";
import { ErrorDisplay } from "./ErrorDisplay.js";
import type { AppError } from "./errors.js";

/**
 * Demonstrates useEffectQuery with full Cause<AppError> pattern matching.
 *
 * Unlike CatchTagDemo, this shows all error types without recovery.
 * The ErrorDisplay component renders color-coded UI for each error type
 * using Cause.match for exhaustive handling.
 */
export const QueryDemo = (): React.ReactNode => {
  const result = useEffectQuery<string, AppError>(
    "user-query",
    fetchUserProfile("1"),
  );

  return (
    <div
      style={{
        padding: "8px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      {matchEffectResult(result, {
        Initial: () => <p style={{ color: "#6b7280" }}>Waiting to fetch...</p>,
        Pending: () => <p style={{ color: "#3b82f6" }}>Loading user...</p>,
        Success: ({ value }) => (
          <p style={{ color: "#059669" }}>
            <strong>{value}</strong>
          </p>
        ),
        Failure: ({ cause }) => <ErrorDisplay cause={cause} />,
        Refreshing: ({ value }) => (
          <p style={{ color: "#059669", opacity: 0.7 }}>
            <strong>{value}</strong> (refreshing...)
          </p>
        ),
      })}
    </div>
  );
};
