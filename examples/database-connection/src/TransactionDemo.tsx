import { useState, useCallback } from "react";
import { Effect } from "effect";
import { useEffectRuntime } from "@effect-react/react";
import { createSubscribable } from "@effect-react/core";
import { useSyncExternalStore, useMemo } from "react";
import type { ConnectionError } from "./ConnectionPool.js";
import { ConnectionPool } from "./ConnectionPool.js";

interface QueryResult {
  readonly sql: string;
  readonly result: string;
  readonly connId: number;
}

/**
 * Demonstrates executing queries through the connection pool.
 *
 * Shows:
 * - `withConnection` pattern for safe connection acquisition and release
 * - Multiple concurrent queries using the pool
 * - How pool state changes as connections are acquired/released
 */
export const TransactionDemo = (): React.ReactNode => {
  const runtime = useEffectRuntime<ConnectionPool, never>();
  const [sqlInput, setSqlInput] = useState("SELECT * FROM users");

  const resultsSubscribable = useMemo(
    () => createSubscribable<ReadonlyArray<QueryResult | string>>([]),
    [runtime],
  );

  const results = useSyncExternalStore(
    resultsSubscribable.subscribe,
    resultsSubscribable.getSnapshot,
  );

  const runSingleQuery = useCallback(
    (sql: string) => {
      runtime.runFork(
        Effect.gen(function* () {
          const pool = yield* ConnectionPool;
          const result = yield* pool.withConnection((conn) =>
            Effect.gen(function* () {
              const res = yield* conn.query(sql);
              return { sql, result: res, connId: conn.id };
            }),
          );
          const current = resultsSubscribable.getSnapshot();
          resultsSubscribable.set([...current, result]);
        }).pipe(
          Effect.catchAll((error: ConnectionError) =>
            Effect.sync(() => {
              const current = resultsSubscribable.getSnapshot();
              resultsSubscribable.set([
                ...current,
                `Error: ${error.message satisfies string}`,
              ]);
            }),
          ),
        ),
      );
    },
    [runtime, resultsSubscribable],
  );

  const runConcurrentQueries = useCallback(() => {
    const queries = [
      "SELECT * FROM users",
      "SELECT * FROM orders",
      "SELECT * FROM products",
    ];
    runtime.runFork(
      Effect.gen(function* () {
        const pool = yield* ConnectionPool;
        // Run 3 queries concurrently - they'll compete for pool connections
        const results = yield* Effect.all(
          queries.map((sql) =>
            pool.withConnection((conn) =>
              Effect.gen(function* () {
                const res = yield* conn.query(sql);
                return { sql, result: res, connId: conn.id };
              }),
            ),
          ),
          { concurrency: "unbounded" },
        );
        const current = resultsSubscribable.getSnapshot();
        resultsSubscribable.set([...current, ...results]);
      }).pipe(
        Effect.catchAll((error: ConnectionError) =>
          Effect.sync(() => {
            const current = resultsSubscribable.getSnapshot();
            resultsSubscribable.set([
              ...current,
              `Error: ${error.message satisfies string}`,
            ]);
          }),
        ),
      ),
    );
  }, [runtime, resultsSubscribable]);

  const clearResults = useCallback(() => {
    resultsSubscribable.set([]);
  }, [resultsSubscribable]);

  return (
    <div
      style={{
        border: "1px solid #4aff6e",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0, color: "#4aff6e" }}>Query Execution</h3>
      <p style={{ color: "#aaa", fontSize: 14 }}>
        Execute queries through the pool using{" "}
        <code style={{ color: "#ff9f4a" }}>withConnection</code>. Each query
        acquires a connection, executes, then releases it back.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={sqlInput}
          onChange={(e) => {
            setSqlInput(e.currentTarget.value);
          }}
          style={{
            flex: 1,
            padding: "6px 10px",
            background: "#1a1a2e",
            border: "1px solid #444",
            borderRadius: 4,
            color: "#eee",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        />
        <button
          onClick={() => {
            runSingleQuery(sqlInput);
          }}
          style={{
            padding: "6px 14px",
            background: "#4aff6e",
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Run
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={runConcurrentQueries}
          style={{
            padding: "6px 14px",
            background: "#ff9f4a",
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Run 3 Concurrent Queries
        </button>
        <button
          onClick={clearResults}
          style={{
            padding: "6px 14px",
            background: "#444",
            color: "#eee",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      <div
        style={{
          background: "#1a1a2e",
          padding: 12,
          borderRadius: 4,
          maxHeight: 200,
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        {results.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>No queries executed yet</p>
        ) : (
          results.map((r, i) => (
            <div
              key={i}
              style={{
                color: typeof r === "string" ? "#ff6b6b" : "#eee",
                marginBottom: 4,
                padding: "2px 0",
                borderBottom: "1px solid #333",
              }}
            >
              {typeof r === "string" ? (
                r
              ) : (
                <>
                  <span style={{ color: "#888" }}>
                    [conn #{String(r.connId) satisfies string}]
                  </span>{" "}
                  <span style={{ color: "#4aff6e" }}>{r.sql}</span> → {r.result}
                </>
              )}
            </div>
          ))
        )}
      </div>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 0 }}>
        Concurrent queries demonstrate how multiple connections from the pool
        can be used simultaneously. Watch the pool status above to see
        active/idle counts change.
      </p>
    </div>
  );
};
