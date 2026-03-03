import { useState, useCallback } from "react";
import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { setFailureMode, getFailureMode, resetServerState } from "./api.js";
import { TodoList } from "./TodoList.js";
import { RollbackDemo } from "./RollbackDemo.js";
import { ConcurrentDemo } from "./ConcurrentDemo.js";

/**
 * Optimistic Updates example.
 *
 * Demonstrates:
 * - `store.setOptimistic(key, value)` for immediate UI updates
 * - `OptimisticRollback.rollback()` for automatic failure recovery
 * - `useEffectMutation` with `onMutate` / `onSuccess` / `onError` callbacks
 * - Multiple concurrent optimistic updates with partial rollback
 */
export const App = (): React.ReactNode => {
  const [failMode, setFailMode] = useState<"none" | "always" | "random">(
    getFailureMode(),
  );
  const [generation, setGeneration] = useState(0);

  const handleFailModeChange = useCallback(
    (mode: "none" | "always" | "random") => {
      setFailureMode(mode);
      setFailMode(mode);
    },
    [],
  );

  const handleReset = useCallback(() => {
    resetServerState();
    setGeneration((g) => g + 1);
  }, []);

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        background: "#0d1117",
        minHeight: "100vh",
      }}
    >
      <h1>Optimistic Updates</h1>
      <p style={{ color: "#aaa", marginBottom: 24 }}>
        Demonstrates{" "}
        <code style={{ color: "#ff9f4a" }}>store.setOptimistic</code> for
        instant UI feedback with automatic rollback on failure.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 24,
          padding: 12,
          background: "#1a1a2e",
          borderRadius: 8,
        }}
      >
        <span style={{ color: "#aaa", fontSize: 13 }}>Failure mode:</span>
        {(["none", "always", "random"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              handleFailModeChange(mode);
            }}
            style={{
              padding: "4px 12px",
              background: failMode === mode ? "#4a9eff" : "#333",
              color: failMode === mode ? "#fff" : "#aaa",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {mode}
          </button>
        ))}
        <span style={{ color: "#666", fontSize: 12, marginLeft: 8 }}>
          {failMode === "none" && "Mutations always succeed"}
          {failMode === "always" && "Mutations always fail (rollback)"}
          {failMode === "random" && "50% chance of failure"}
        </span>
        <button
          onClick={handleReset}
          style={{
            marginLeft: "auto",
            padding: "4px 12px",
            background: "#444",
            color: "#eee",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Reset Server
        </button>
      </div>

      <EffectProvider layer={Layer.empty} key={generation}>
        <TodoList />
        <RollbackDemo />
        <ConcurrentDemo />
      </EffectProvider>
    </div>
  );
};
