import { useState, useCallback } from "react";
import { Effect } from "effect";
import {
  useEffectMutation,
  useEffectQuery,
  useEffectStore,
} from "@effect-react/react";
import { getValue, matchEffectResult } from "@effect-react/core";
import type { Todo } from "./api.js";
import { ApiError, fetchTodos } from "./api.js";

const QUERY_KEY = "concurrent-todos";

/**
 * Demonstrates multiple concurrent optimistic updates.
 *
 * Click "Toggle All Incomplete" to toggle all incomplete todos simultaneously.
 * Each mutation has a 50% chance of failure with random delay,
 * showing partial rollback behavior.
 */
export const ConcurrentDemo = (): React.ReactNode => {
  const store = useEffectStore();
  const [logs, setLogs] = useState<ReadonlyArray<string>>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-14), msg]);
  }, []);

  const result = useEffectQuery<ReadonlyArray<Todo>, ApiError>(
    QUERY_KEY,
    fetchTodos,
  );

  const { mutate } = useEffectMutation<string, ReadonlyArray<Todo>, ApiError>(
    (id: string) =>
      Effect.gen(function* () {
        // Random delay between 500-1500ms
        yield* Effect.sleep(500 + Math.floor(Math.random() * 1000));
        // 50% chance of failure
        if (Math.random() < 0.5) {
          return yield* Effect.fail(
            new ApiError({
              message: `Failed to toggle todo ${id satisfies string}`,
            }),
          );
        }
        // On success, return the current cached todos with the toggle applied
        const current = getValue<ReadonlyArray<Todo>, ApiError>(
          store.getSnapshot<ReadonlyArray<Todo>, ApiError>(QUERY_KEY),
        );
        const updated = (current ?? []).map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        );
        return updated;
      }),
    {
      onMutate: (id: string) => {
        const current = getValue<ReadonlyArray<Todo>, ApiError>(
          store.getSnapshot<ReadonlyArray<Todo>, ApiError>(QUERY_KEY),
        );
        if (current === undefined) return undefined;
        const todo = current.find((t) => t.id === id);
        if (todo === undefined) return undefined;
        const updated = current.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        );
        addLog(
          `Optimistic: "${todo.title satisfies string}" → ${String(!todo.completed) satisfies string}`,
        );
        return store.setOptimistic(QUERY_KEY, updated);
      },
      onSuccess: (_value: ReadonlyArray<Todo>, id: string) => {
        addLog(`Success: todo ${id satisfies string}`);
      },
      onError: (_cause, id: string) => {
        addLog(`Rolled back: todo ${id satisfies string}`);
      },
    },
  );

  const handleToggleAll = useCallback(() => {
    const current = getValue<ReadonlyArray<Todo>, ApiError>(
      store.getSnapshot<ReadonlyArray<Todo>, ApiError>(QUERY_KEY),
    );
    if (current === undefined) return;
    const incomplete = current.filter((t) => !t.completed);
    for (const todo of incomplete) {
      mutate(todo.id);
    }
  }, [store, mutate]);

  return (
    <div
      style={{
        border: "1px solid #ff4a9e",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#ff4a9e" }}>
        Concurrent Optimistic Updates
      </h3>
      <p style={{ color: "#aaa", fontSize: 14 }}>
        Toggles multiple todos at once. Each has a 50% chance of failure with
        random delay. Observe partial rollbacks as some succeed and others fail.
      </p>

      <button
        onClick={handleToggleAll}
        style={{
          padding: "8px 16px",
          background: "#ff4a9e",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontWeight: "bold",
          marginBottom: 16,
        }}
      >
        Toggle All Incomplete
      </button>

      {matchEffectResult<ReadonlyArray<Todo>, ApiError, React.ReactNode>(
        result,
        {
          Initial: () => <p style={{ color: "#888" }}>Not started</p>,
          Pending: () => <p style={{ color: "#888" }}>Loading...</p>,
          Failure: ({ cause }) => (
            <p style={{ color: "#ff4a4a" }}>Error: {String(cause)}</p>
          ),
          Success: ({ value }) => <ConcurrentTodoItems todos={value} />,
          Refreshing: ({ value }) => <ConcurrentTodoItems todos={value} />,
        },
      )}

      <div
        style={{
          background: "#1a1a2e",
          padding: 12,
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 12,
          maxHeight: 150,
          overflowY: "auto",
          marginTop: 12,
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>
            Click &quot;Toggle All Incomplete&quot; to start
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

const ConcurrentTodoItems = ({
  todos,
}: {
  readonly todos: ReadonlyArray<Todo>;
}): React.ReactNode => (
  <div>
    {todos.map((todo) => (
      <div
        key={todo.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 0",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: 2,
            background: todo.completed ? "#4aff6e" : "#444",
            border: "1px solid #666",
          }}
        />
        <span
          style={{
            textDecoration: todo.completed ? "line-through" : "none",
            color: todo.completed ? "#888" : "#eee",
            fontSize: 14,
          }}
        >
          {todo.title}
        </span>
      </div>
    ))}
  </div>
);
