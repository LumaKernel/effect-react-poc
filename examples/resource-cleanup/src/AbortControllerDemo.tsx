import React, { useCallback, useState } from "react";
import { Effect } from "effect";
import { useEffectScope } from "@effect-react/react";

/**
 * Demonstrates AbortController integration with useEffectScope.
 *
 * - Creates an AbortController per fetch request
 * - Registers controller.abort() as a Scope finalizer
 * - Unmounting the component aborts all in-flight requests
 */
export const AbortControllerDemo = (): React.ReactNode => {
  const scope = useEffectScope();

  const [status, setStatus] = useState("Idle");
  const [requestCount, setRequestCount] = useState(0);

  const startFetch = useCallback(() => {
    // Create an AbortController managed by the Scope
    const controller = new AbortController();

    setRequestCount((c) => c + 1);
    setStatus("Fetching...");

    // Register abort as a Scope finalizer — this is the key pattern!
    // When the component unmounts, the Scope closes and all finalizers run.
    scope.addFinalizer(
      Effect.sync(() => {
        controller.abort();
      }),
    );

    // Perform the fetch with the controller's signal
    fetch("https://jsonplaceholder.typicode.com/posts/1", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: unknown) => {
        const title =
          typeof data === "object" &&
          data !== null &&
          "title" in data &&
          typeof data.title === "string"
            ? data.title
            : "Unknown";
        setStatus(`Success: "${title satisfies string}"`);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("Aborted (scope closed)");
        } else {
          setStatus("Request failed");
        }
      });
  }, [scope]);

  return (
    <div style={{ border: "1px solid #ff4a4a", padding: 16, borderRadius: 8 }}>
      <h3>AbortController Demo</h3>
      <p>
        Manages <code>AbortController</code> via Scope. In-flight requests are
        automatically aborted when the component unmounts.
      </p>
      <button onClick={startFetch}>Fetch Data</button>
      <p style={{ fontFamily: "monospace", marginTop: 8 }}>Status: {status}</p>
      <p style={{ fontFamily: "monospace", fontSize: 12, color: "#888" }}>
        Requests made: {String(requestCount) satisfies string}
      </p>
      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        Each request&apos;s AbortController is registered as a Scope finalizer.
        Unmounting aborts all pending requests.
      </p>
    </div>
  );
};
