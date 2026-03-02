import { matchEffectResult } from "@effect-react/core";
import { useEffectQuery } from "@effect-react/react";
import { Cause, Option } from "effect";
import { fetchUserWithFallback } from "./api.js";
import type { NetworkError, TimeoutError, ValidationError } from "./errors.js";

type NarrowedError = NetworkError | ValidationError | TimeoutError;

/**
 * Renders the narrowed error type (NotFoundError already removed by catchTag).
 */
const renderNarrowedError = (error: NarrowedError): React.ReactNode => {
  switch (error._tag) {
    case "NetworkError":
      return (
        <p style={{ color: "#ef4444" }}>
          Network error connecting to {error.url}
        </p>
      );
    case "ValidationError":
      return (
        <p style={{ color: "#f59e0b" }}>
          Validation: {error.reason} (field: {error.field})
        </p>
      );
    case "TimeoutError":
      return (
        <p style={{ color: "#ec4899" }}>
          Timeout after {`${String(error.durationMs) satisfies string}ms`}
        </p>
      );
  }
};

/**
 * Demonstrates Effect.catchTag for selective error recovery.
 *
 * The `fetchUserWithFallback` effect uses `Effect.catchTag("NotFoundError", ...)`
 * to convert NotFoundError into a fallback value, while letting
 * NetworkError, ValidationError, and TimeoutError propagate as failures.
 *
 * Note how the error type narrows: the original AppError union becomes
 * `NetworkError | ValidationError | TimeoutError` after catchTag removes NotFoundError.
 */
export const CatchTagDemo = (): React.ReactNode => {
  const result = useEffectQuery<string, NarrowedError>(
    "user-with-fallback",
    fetchUserWithFallback("42"),
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
        Failure: ({ cause }) => {
          const maybeError = Cause.failureOption(cause);
          if (Option.isSome(maybeError)) {
            return renderNarrowedError(maybeError.value);
          }
          return (
            <p style={{ color: "#9ca3af" }}>Unknown error: {String(cause)}</p>
          );
        },
        Refreshing: ({ value }) => (
          <p style={{ color: "#059669", opacity: 0.7 }}>
            <strong>{value}</strong> (refreshing...)
          </p>
        ),
      })}
    </div>
  );
};
