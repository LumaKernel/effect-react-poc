import React, { useCallback, useState } from "react";
import { Effect } from "effect";
import { useEffectScope } from "@effect-react/react";

interface ResourceLog {
  readonly time: string;
  readonly action: string;
  readonly resource: string;
}

const formatTime = (): string => {
  // eslint-disable-next-line luma-ts/no-date -- timestamp for demo log
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0") satisfies string;
  const minutes = String(d.getMinutes()).padStart(2, "0") satisfies string;
  const seconds = String(d.getSeconds()).padStart(2, "0") satisfies string;
  const ms = String(d.getMilliseconds()).padStart(3, "0") satisfies string;
  return `${hours satisfies string}:${minutes satisfies string}:${seconds satisfies string}.${ms satisfies string}`;
};

/**
 * Demonstrates managing multiple resources in a single useEffectScope.
 *
 * When "Acquire All" is clicked, three resources are registered:
 * 1. EventListener (mousemove)
 * 2. Interval timer
 * 3. AbortController for a fetch
 *
 * All are cleaned up together when the component unmounts (Scope closes).
 * Finalizers execute in LIFO order (last registered = first cleaned up).
 */
export const CombinedResourceDemo = (): React.ReactNode => {
  const scope = useEffectScope();

  const [acquired, setAcquired] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);
  const [fetchStatus, setFetchStatus] = useState("Not started");
  const [logs, setLogs] = useState<readonly ResourceLog[]>([]);

  const addLog = useCallback((resource: string, action: string) => {
    setLogs((prev) => [...prev, { time: formatTime(), action, resource }]);
  }, []);

  const acquireAll = useCallback(() => {
    if (acquired) return;
    setAcquired(true);

    // --- Resource 1: mousemove EventListener ---
    const mouseHandler = (e: MouseEvent): void => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", mouseHandler);
    addLog("EventListener", "Acquired (mousemove)");

    scope.addFinalizer(
      Effect.sync(() => {
        window.removeEventListener("mousemove", mouseHandler);
        addLog("EventListener", "Released (mousemove removed)");
      }),
    );

    // --- Resource 2: setInterval ---
    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
    }, 500);
    addLog("Interval", "Acquired (500ms tick)");

    scope.addFinalizer(
      Effect.sync(() => {
        clearInterval(intervalId);
        addLog("Interval", "Released (cleared)");
      }),
    );

    // --- Resource 3: AbortController for fetch ---
    const controller = new AbortController();
    addLog("AbortController", "Acquired");
    setFetchStatus("Fetching...");

    scope.addFinalizer(
      Effect.sync(() => {
        controller.abort();
        addLog("AbortController", "Released (aborted)");
      }),
    );

    fetch("https://jsonplaceholder.typicode.com/posts", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: unknown) => {
        const count = Array.isArray(data) ? data.length : 0;
        setFetchStatus(`Loaded ${String(count) satisfies string} posts`);
        addLog("Fetch", "Completed successfully");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          setFetchStatus("Aborted");
          addLog("Fetch", "Aborted by scope cleanup");
        } else {
          setFetchStatus("Failed");
          addLog("Fetch", "Failed with error");
        }
      });
  }, [scope, acquired, addLog]);

  return (
    <div style={{ border: "1px solid #ff9f4a", padding: 16, borderRadius: 8 }}>
      <h3>Combined Resource Demo</h3>
      <p>
        Manages <strong>three resources</strong> in a single{" "}
        <code>useEffectScope</code>. All are cleaned up together on unmount
        (LIFO order).
      </p>

      <button onClick={acquireAll} disabled={acquired}>
        {acquired ? "All Acquired" : "Acquire All Resources"}
      </button>

      {acquired && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div style={{ padding: 8, background: "#1a1a2e", borderRadius: 4 }}>
            <strong style={{ color: "#4a9eff" }}>Mouse</strong>
            <p style={{ fontFamily: "monospace", fontSize: 14 }}>
              ({String(mousePos.x) satisfies string},{" "}
              {String(mousePos.y) satisfies string})
            </p>
          </div>
          <div style={{ padding: 8, background: "#1a1a2e", borderRadius: 4 }}>
            <strong style={{ color: "#4aff6e" }}>Tick</strong>
            <p style={{ fontFamily: "monospace", fontSize: 14 }}>
              {String(tick) satisfies string}
            </p>
          </div>
          <div style={{ padding: 8, background: "#1a1a2e", borderRadius: 4 }}>
            <strong style={{ color: "#ff4a4a" }}>Fetch</strong>
            <p style={{ fontFamily: "monospace", fontSize: 14 }}>
              {fetchStatus}
            </p>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: "#1a1a2e",
            color: "#0f0",
            padding: 8,
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 11,
            maxHeight: 160,
            overflow: "auto",
          }}
        >
          <div style={{ color: "#888", marginBottom: 4 }}>
            Resource lifecycle log (LIFO cleanup on unmount):
          </div>
          {logs.map((entry, i) => (
            <div
              key={i}
              style={{
                color: entry.action.startsWith("Released")
                  ? "#ff6b6b"
                  : "#6bff6b",
              }}
            >
              [{entry.time}] {entry.resource}: {entry.action}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        Unmount this component (toggle below) to see all resources cleaned up at
        once. Finalizers run in reverse order (LIFO): AbortController → Interval
        → EventListener.
      </p>
    </div>
  );
};
