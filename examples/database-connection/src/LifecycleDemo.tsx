import { useState, useCallback } from "react";
import { EffectProvider } from "@effect-react/react";
import { makeConnectionPoolLive } from "./ConnectionPool.js";
import { PoolStatusDemo } from "./PoolStatusDemo.js";
import { TransactionDemo } from "./TransactionDemo.js";

/**
 * Demonstrates the connection pool lifecycle being tied to the Provider.
 *
 * Shows:
 * - Mounting the Provider creates the connection pool (Layer.scoped acquire)
 * - Unmounting the Provider closes all connections (Layer.scoped release)
 * - The pool lifecycle is independent of individual component lifecycles
 * - Re-mounting creates a fresh pool
 */
export const LifecycleDemo = (): React.ReactNode => {
  const [mounted, setMounted] = useState(false);
  const [poolSize, setPoolSize] = useState(3);

  const toggle = useCallback(() => {
    setMounted((prev) => !prev);
  }, []);

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
        Pool Lifecycle Management
      </h3>
      <p style={{ color: "#aaa", fontSize: 14 }}>
        Mount/unmount the EffectProvider to observe{" "}
        <code style={{ color: "#ff9f4a" }}>Layer.scoped</code> lifecycle. The
        pool is created on mount (acquireRelease acquire) and destroyed on
        unmount (acquireRelease release).
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          onClick={toggle}
          style={{
            padding: "8px 20px",
            background: mounted ? "#ff4a4a" : "#4aff6e",
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          {mounted
            ? "Unmount Provider (Close Pool)"
            : "Mount Provider (Create Pool)"}
        </button>
        <label style={{ color: "#aaa", fontSize: 13 }}>
          Pool size:{" "}
          <select
            value={poolSize}
            onChange={(e) => {
              setPoolSize(Number(e.currentTarget.value));
            }}
            disabled={mounted}
            style={{
              background: "#1a1a2e",
              color: "#eee",
              border: "1px solid #444",
              borderRadius: 4,
              padding: "4px 8px",
            }}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </label>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: mounted ? "#4aff6e" : "#666",
          }}
        />
        <span style={{ color: mounted ? "#4aff6e" : "#666", fontSize: 13 }}>
          {mounted ? "Pool Active" : "Pool Inactive"}
        </span>
      </div>

      {mounted && (
        <EffectProvider layer={makeConnectionPoolLive(poolSize)}>
          <div
            style={{
              borderLeft: "3px solid #ff4a9e",
              paddingLeft: 16,
              marginTop: 16,
            }}
          >
            <p style={{ color: "#ff4a9e", fontSize: 12, marginTop: 0 }}>
              EffectProvider scope (pool alive while mounted)
            </p>
            <PoolStatusDemo />
            <TransactionDemo />
          </div>
        </EffectProvider>
      )}

      <p style={{ fontSize: 12, color: "#888", marginBottom: 0 }}>
        Try: Mount → run some queries → Unmount → observe cleanup logs →
        Re-mount to see a fresh pool. The pool size can only be changed while
        unmounted.
      </p>
    </div>
  );
};
