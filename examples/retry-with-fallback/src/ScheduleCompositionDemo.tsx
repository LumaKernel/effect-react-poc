import { useState } from "react";
import { Effect, Schedule } from "effect";
import { matchEffectResult } from "@effect-react/core";
import { useEffectQuery, useEffectStore } from "@effect-react/react";
import { ApiError } from "./errors.js";
import { RetryProgress } from "./RetryProgress.js";

/**
 * Demonstrates different Schedule compositions for retry strategies.
 *
 * Shows how to combine Schedule primitives:
 * - `Schedule.recurs(n)`: fixed number of retries
 * - `Schedule.exponential(base)`: exponential backoff
 * - `Schedule.intersect`: combine schedules (both must allow)
 * - `Schedule.union`: combine schedules (either allows)
 *
 * Demonstrates: Schedule composition, different retry strategies side by side.
 */
export const ScheduleCompositionDemo = (): React.ReactNode => {
  const [generation, setGeneration] = useState(0);

  const handleReset = (): void => {
    setGeneration((prev) => prev + 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <ScheduleCard
        title="Fixed Retries (3x)"
        description="Schedule.recurs(3) - retries up to 3 times with no delay"
        schedule={Schedule.recurs(3)}
        maxRetries={3}
        queryKey={`fixed-${String(generation) satisfies string}`}
      />
      <ScheduleCard
        title="Exponential Backoff (max 3)"
        description="Schedule.intersect(exponential(200ms), recurs(3)) - exponential delay, max 3 retries"
        schedule={Schedule.intersect(
          Schedule.exponential("200 millis"),
          Schedule.recurs(3),
        )}
        maxRetries={3}
        queryKey={`expo-${String(generation) satisfies string}`}
      />
      <ScheduleCard
        title="Spaced Retries (500ms, max 2)"
        description="Schedule.intersect(spaced(500ms), recurs(2)) - fixed 500ms delay, max 2 retries"
        schedule={Schedule.intersect(
          Schedule.spaced("500 millis"),
          Schedule.recurs(2),
        )}
        maxRetries={2}
        queryKey={`spaced-${String(generation) satisfies string}`}
      />

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
          alignSelf: "flex-start",
        }}
      >
        Reset All
      </button>
    </div>
  );
};

let callCounters: Record<string, number> = {};

const ScheduleCard = ({
  title,
  description,
  schedule,
  maxRetries,
  queryKey,
}: {
  readonly title: string;
  readonly description: string;
  readonly schedule: Schedule.Schedule<unknown, ApiError>;
  readonly maxRetries: number;
  readonly queryKey: string;
}): React.ReactNode => {
  // Reset counter when queryKey changes (via generation)
  if (!(queryKey in callCounters)) {
    callCounters = { ...callCounters, [queryKey]: 0 };
  }

  const effect = Effect.gen(function* () {
    const counter = callCounters[queryKey] ?? 0;
    callCounters = { ...callCounters, [queryKey]: counter + 1 };
    const current = counter + 1;

    yield* Effect.sleep("100 millis");

    return yield* Effect.fail(
      new ApiError({
        source: "schedule-demo",
        message: `Always fails (attempt ${String(current) satisfies string})`,
      }),
    );
  });

  const result = useEffectQuery<never, ApiError>(queryKey, effect, {
    schedule,
  });
  const store = useEffectStore();

  const handleRetry = (): void => {
    store.invalidate(queryKey);
  };

  return (
    <div
      style={{
        padding: "12px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      <h4 style={{ margin: "0 0 4px 0" }}>{title}</h4>
      <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#6b7280" }}>
        <code>{description}</code>
      </p>

      {matchEffectResult(result, {
        Initial: () => <span style={{ color: "#9ca3af" }}>Waiting...</span>,
        Pending: () => <span style={{ color: "#3b82f6" }}>Fetching...</span>,
        Success: ({ value }) => (
          <span style={{ color: "#10b981" }}>{value}</span>
        ),
        Failure: () => (
          <span style={{ color: "#ef4444" }}>
            Failed after {String(maxRetries) satisfies string} retries
          </span>
        ),
        Refreshing: () => (
          <span style={{ color: "#6366f1" }}>Refreshing...</span>
        ),
      })}

      <RetryProgress queryKey={queryKey} maxRetries={maxRetries} />

      <button
        type="button"
        onClick={handleRetry}
        style={{
          marginTop: "8px",
          padding: "4px 12px",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        Retry
      </button>
    </div>
  );
};
