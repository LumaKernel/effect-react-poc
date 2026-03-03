import { useCallback } from "react";
import {
  useEffectMutation,
  useEffectQuery,
  useEffectStore,
} from "@effect-react/react";
import { getValue, matchEffectResult } from "@effect-react/core";
import type { Todo, ApiError } from "./api.js";
import { fetchTodos, toggleTodo } from "./api.js";

const QUERY_KEY = "todos";

/**
 * Demonstrates optimistic updates with useEffectMutation.
 *
 * Flow:
 * 1. User clicks a todo checkbox
 * 2. `onMutate` immediately updates the UI via `store.setOptimistic`
 * 3. The actual API call runs in the background
 * 4. If it succeeds, the real data replaces the optimistic value
 * 5. If it fails, `OptimisticRollback.rollback()` restores the previous state
 */
export const TodoList = (): React.ReactNode => {
  const store = useEffectStore();

  const result = useEffectQuery<ReadonlyArray<Todo>, ApiError>(
    QUERY_KEY,
    fetchTodos,
  );

  const { mutate, result: mutationResult } = useEffectMutation<
    string,
    ReadonlyArray<Todo>,
    ApiError
  >((id: string) => toggleTodo(id), {
    onMutate: (id: string) => {
      // Optimistically toggle the todo in the cache
      const current = getValue<ReadonlyArray<Todo>, ApiError>(
        store.getSnapshot<ReadonlyArray<Todo>, ApiError>(QUERY_KEY),
      );
      if (current === undefined) return undefined;
      const updated = current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      );
      return store.setOptimistic(QUERY_KEY, updated);
    },
    onSuccess: (newTodos: ReadonlyArray<Todo>) => {
      // Replace cache with the server's response
      store.setOptimistic(QUERY_KEY, newTodos);
    },
  });

  const handleToggle = useCallback(
    (id: string) => {
      mutate(id);
    },
    [mutate],
  );

  return (
    <div
      style={{
        border: "1px solid #4a9eff",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#4a9eff" }}>Optimistic Todo Toggle</h3>
      <p style={{ color: "#aaa", fontSize: 14 }}>
        Click a checkbox to toggle. The UI updates immediately via{" "}
        <code style={{ color: "#ff9f4a" }}>setOptimistic</code>, while the API
        call runs in the background. If it fails, the state rolls back
        automatically.
      </p>

      {matchEffectResult<ReadonlyArray<Todo>, ApiError, React.ReactNode>(
        result,
        {
          Initial: () => <p style={{ color: "#888" }}>Not started</p>,
          Pending: () => <p style={{ color: "#888" }}>Loading todos...</p>,
          Failure: ({ cause }) => (
            <p style={{ color: "#ff4a4a" }}>Error: {String(cause)}</p>
          ),
          Success: ({ value }) => (
            <TodoItems todos={value} onToggle={handleToggle} />
          ),
          Refreshing: ({ value }) => (
            <TodoItems todos={value} onToggle={handleToggle} />
          ),
        },
      )}

      {mutationResult._tag === "Failure" && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: "#2a1a1a",
            border: "1px solid #ff4a4a",
            borderRadius: 4,
            color: "#ff6b6b",
            fontSize: 13,
          }}
        >
          Mutation failed — rolled back to previous state
        </div>
      )}
      {mutationResult._tag === "Pending" && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: "#1a2a1a",
            border: "1px solid #4aff6e",
            borderRadius: 4,
            color: "#4aff6e",
            fontSize: 13,
          }}
        >
          Saving to server...
        </div>
      )}
    </div>
  );
};

const TodoItems = ({
  todos,
  onToggle,
}: {
  readonly todos: ReadonlyArray<Todo>;
  readonly onToggle: (id: string) => void;
}): React.ReactNode => (
  <div>
    {todos.map((todo) => (
      <div
        key={todo.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
          borderBottom: "1px solid #333",
        }}
      >
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => {
            onToggle(todo.id);
          }}
          style={{ cursor: "pointer" }}
        />
        <span
          style={{
            textDecoration: todo.completed ? "line-through" : "none",
            color: todo.completed ? "#888" : "#eee",
          }}
        >
          {todo.title}
        </span>
      </div>
    ))}
  </div>
);
