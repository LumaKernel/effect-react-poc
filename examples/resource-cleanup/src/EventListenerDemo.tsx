import React, { useCallback, useState } from "react";
import { Effect } from "effect";
import { useEffectScope } from "@effect-react/react";

/**
 * Demonstrates EventListener registration/cleanup using useEffectScope.
 *
 * - Registers a `resize` listener on window
 * - Cleans up via Scope finalizer on unmount
 * - Displays real-time window dimensions
 */
export const EventListenerDemo = (): React.ReactNode => {
  const scope = useEffectScope();

  const [size, setSize] = useState<{
    readonly width: number;
    readonly height: number;
  }>({ width: window.innerWidth, height: window.innerHeight });
  const [listening, setListening] = useState(false);

  const startListening = useCallback(() => {
    if (listening) return;

    const handler = (): void => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handler);
    setListening(true);

    // Register cleanup as a Scope finalizer
    scope.addFinalizer(
      Effect.sync(() => {
        window.removeEventListener("resize", handler);
        setListening(false);
      }),
    );
  }, [scope, listening]);

  return (
    <div style={{ border: "1px solid #4a9eff", padding: 16, borderRadius: 8 }}>
      <h3>EventListener Demo</h3>
      <p>
        Registers a <code>window.resize</code> listener and cleans it up via
        Scope finalizer.
      </p>
      <button onClick={startListening} disabled={listening}>
        {listening ? "Listening..." : "Start Listening"}
      </button>
      {listening && (
        <p style={{ fontFamily: "monospace", marginTop: 8 }}>
          Window size: {String(size.width) satisfies string} x{" "}
          {String(size.height) satisfies string}
        </p>
      )}
      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        The listener is automatically removed when the component unmounts (Scope
        closes).
      </p>
    </div>
  );
};
