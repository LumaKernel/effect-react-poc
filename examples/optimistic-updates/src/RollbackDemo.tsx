import { useState, useCallback } from "react";
import { Effect } from "effect";
import {
  useEffectMutation,
  useEffectQuery,
  useEffectStore,
} from "@effect-react/react";
import { getValue, matchEffectResult } from "@effect-react/core";
import { ApiError } from "./api.js";

const QUERY_KEY = "rollback-counter";

/**
 * Demonstrates rollback behavior with a simple counter.
 *
 * The mutation always fails, so the optimistic update is always rolled back.
 * This makes it easy to see the rollback in action:
 * 1. Click +/- → counter shows new value immediately (optimistic)
 * 2. After 800ms, the "server" responds with an error
 * 3. The counter rolls back to the previous value
 */
export const RollbackDemo = (): React.ReactNode => {
  const store = useEffectStore();
  const [logs, setLogs] = useState<ReadonlyArray<string>>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-9), msg]);
  }, []);

  const result = useEffectQuery<number, ApiError>(QUERY_KEY, Effect.succeed(0));

  const { mutate, result: mutationResult } = useEffectMutation<
    "increment" | "decrement",
    number,
    ApiError
  >(
    (action: "increment" | "decrement") =>
      Effect.gen(function* () {
        yield* Effect.sleep("800 millis");
        return yield* Effect.fail(
          new ApiError({
            message: `Server rejected ${action satisfies string} operation`,
          }),
        );
      }),
    {
      onMutate: (action: "increment" | "decrement") => {
        const current =
          getValue<number, ApiError>(
            store.getSnapshot<number, ApiError>(QUERY_KEY),
          ) ?? 0;
        const newValue = action === "increment" ? current + 1 : current - 1;
        addLog(
          `Optimistic: ${String(current) satisfies string} → ${String(newValue) satisfies string}`,
        );
        return store.setOptimistic(QUERY_KEY, newValue);
      },
      onSuccess: (_value: number, action: "increment" | "decrement") => {
        addLog(`Success: ${action satisfies string}`);
      },
      onError: (_cause, action: "increment" | "decrement") => {
        addLog(`Rolled back: ${action satisfies string} failed`);
      },
    },
  );

  return (
    <div
      style={{
        border: "1px solid #ff9f4a",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#ff9f4a" }}>Rollback Demonstration</h3>
      <p style={{ color: "#aaa", fontSize: 14 }}>
        The mutation <strong>always fails</strong>. Watch the value change
        optimistically then roll back after the simulated API error.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => {
            mutate("decrement");
          }}
          style={{
            padding: "8px 16px",
            background: "#ff4a4a",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          -
        </button>
        <div
          style={{
            fontSize: 32,
            fontFamily: "monospace",
            fontWeight: "bold",
            color:
              mutationResult._tag === "Pending"
                ? "#ff9f4a"
                : mutationResult._tag === "Failure"
                  ? "#ff4a4a"
                  : "#eee",
            minWidth: 60,
            textAlign: "center",
            transition: "color 0.3s ease",
          }}
        >
          {matchEffectResult<number, ApiError, string>(result, {
            Initial: () => "...",
            Pending: () => "...",
            Success: ({ value }) => String(value),
            Failure: () => "!",
            Refreshing: ({ value }) => String(value),
          })}
        </div>
        <button
          onClick={() => {
            mutate("increment");
          }}
          style={{
            padding: "8px 16px",
            background: "#4aff6e",
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          +
        </button>
      </div>

      <div
        style={{
          background: "#1a1a2e",
          padding: 12,
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 12,
          maxHeight: 150,
          overflowY: "auto",
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>
            Click +/- to see optimistic update → rollback
          </p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              style={{
                color: log.startsWith("Rolled")
                  ? "#ff6b6b"
                  : log.startsWith("Optimistic")
                    ? "#ff9f4a"
                    : "#4aff6e",
                marginBottom: 2,
              }}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
