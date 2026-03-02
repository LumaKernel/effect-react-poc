import React, { useCallback, useState } from "react";
import { Effect } from "effect";
import { useEffectScope } from "@effect-react/react";

/**
 * Demonstrates setInterval management using useEffectScope.
 *
 * - Creates an interval timer that counts up
 * - Cleans up via Scope finalizer on unmount
 * - Shows how to register multiple finalizers (LIFO cleanup order)
 */
export const IntervalDemo = (): React.ReactNode => {
  const scope = useEffectScope();

  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<readonly string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  const startTimer = useCallback(() => {
    if (running) return;

    // eslint-disable-next-line luma-ts/no-date -- Timer for demo purposes
    const startTime = Date.now();
    const id = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    setRunning(true);
    addLog("Timer started");

    // Register cleanup: clear the interval
    scope.addFinalizer(
      Effect.sync(() => {
        clearInterval(id);
        setRunning(false);
        // eslint-disable-next-line luma-ts/no-date -- Timer for demo purposes
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        addLog(`Timer stopped (ran for ${String(elapsed) satisfies string}s)`);
      }),
    );
  }, [scope, running, addLog]);

  return (
    <div style={{ border: "1px solid #4aff6e", padding: 16, borderRadius: 8 }}>
      <h3>Interval Demo</h3>
      <p>
        Manages <code>setInterval</code> via Scope. The interval is
        automatically cleared when the component unmounts.
      </p>
      <button onClick={startTimer} disabled={running}>
        {running ? "Running..." : "Start Timer"}
      </button>
      <p style={{ fontFamily: "monospace", fontSize: 24, margin: "8px 0" }}>
        Count: {String(count) satisfies string}
      </p>
      {log.length > 0 && (
        <div
          style={{
            background: "#1a1a2e",
            color: "#0f0",
            padding: 8,
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 12,
            maxHeight: 120,
            overflow: "auto",
          }}
        >
          {log.map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        Finalizers run in LIFO order. Unmounting clears the interval
        automatically.
      </p>
    </div>
  );
};
