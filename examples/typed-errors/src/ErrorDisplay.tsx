import { Cause } from "effect";
import {
  NetworkError,
  NotFoundError,
  TimeoutError,
  ValidationError,
} from "./errors.js";
import type { AppError } from "./errors.js";

const errorStyles: Record<string, React.CSSProperties> = {
  NetworkError: {
    backgroundColor: "#fee2e2",
    borderColor: "#ef4444",
    color: "#991b1b",
  },
  ValidationError: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    color: "#92400e",
  },
  NotFoundError: {
    backgroundColor: "#e0e7ff",
    borderColor: "#6366f1",
    color: "#3730a3",
  },
  TimeoutError: {
    backgroundColor: "#fce7f3",
    borderColor: "#ec4899",
    color: "#9d174d",
  },
};

const containerStyle: React.CSSProperties = {
  border: "2px solid",
  borderRadius: "8px",
  padding: "12px",
  margin: "8px 0",
};

/**
 * Attempts to narrow an unknown value to AppError using instanceof checks.
 * Returns the typed error if valid, or null otherwise.
 */
const toAppError = (value: unknown): AppError | null => {
  if (value instanceof NetworkError) return value;
  if (value instanceof ValidationError) return value;
  if (value instanceof NotFoundError) return value;
  if (value instanceof TimeoutError) return value;
  return null;
};

/**
 * Renders a single typed error with color-coded display.
 */
const renderAppError = (error: AppError): React.ReactNode => {
  const style = {
    ...containerStyle,
    ...errorStyles[error._tag],
  };

  switch (error._tag) {
    case "NetworkError":
      return (
        <div style={style}>
          <strong>Network Error</strong>
          <p>
            Failed to connect to: <code>{error.url}</code>
          </p>
          <p>Check your internet connection and try again.</p>
        </div>
      );
    case "ValidationError":
      return (
        <div style={style}>
          <strong>Validation Error</strong>
          <p>
            Field <code>{error.field}</code>: {error.reason}
          </p>
        </div>
      );
    case "NotFoundError":
      return (
        <div style={style}>
          <strong>Not Found</strong>
          <p>
            {error.resource} with ID <code>{error.id}</code> was not found.
          </p>
        </div>
      );
    case "TimeoutError":
      return (
        <div style={style}>
          <strong>Timeout</strong>
          <p>
            Request timed out after{" "}
            {`${String(error.durationMs) satisfies string}ms`}.
          </p>
        </div>
      );
  }
};

/**
 * Displays a Cause<unknown> with pattern matching, narrowing to AppError at runtime.
 *
 * Accepts Cause<unknown> because EffectBoundary's renderError provides Cause<unknown>.
 * Uses a runtime type guard to narrow the error to AppError.
 *
 * Demonstrates: Cause.match for exhaustive handling of Cause variants
 * (Fail, Die, Interrupt, Sequential, Parallel, Empty).
 */
export const ErrorDisplay = ({
  cause,
}: {
  readonly cause: Cause.Cause<unknown>;
}): React.ReactNode => {
  const rendered = Cause.match(cause, {
    onEmpty: <p>No error (empty cause)</p>,
    onFail: (error) => {
      const appError = toAppError(error);
      if (appError !== null) {
        return renderAppError(appError);
      }
      return (
        <div
          style={{
            ...containerStyle,
            backgroundColor: "#f3f4f6",
            borderColor: "#6b7280",
            color: "#374151",
          }}
        >
          <strong>Unknown Error</strong>
          <p>{String(error)}</p>
        </div>
      );
    },
    onDie: (defect) => (
      <div
        style={{
          ...containerStyle,
          backgroundColor: "#1f2937",
          borderColor: "#374151",
          color: "#f87171",
        }}
      >
        <strong>Unexpected Defect</strong>
        <p>An unexpected error occurred: {String(defect)}</p>
      </div>
    ),
    onInterrupt: () => (
      <div
        style={{
          ...containerStyle,
          backgroundColor: "#f3f4f6",
          borderColor: "#9ca3af",
          color: "#6b7280",
        }}
      >
        <strong>Interrupted</strong>
        <p>The operation was cancelled.</p>
      </div>
    ),
    onSequential: (left, right) => (
      <div>
        <p>
          <em>Sequential errors:</em>
        </p>
        {left}
        {right}
      </div>
    ),
    onParallel: (left, right) => (
      <div>
        <p>
          <em>Parallel errors:</em>
        </p>
        {left}
        {right}
      </div>
    ),
  });

  return <>{rendered}</>;
};
