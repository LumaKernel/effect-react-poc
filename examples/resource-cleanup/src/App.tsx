import React, { useState } from "react";
import { Layer } from "effect";
import { EffectProvider } from "@effect-react/react";
import { EventListenerDemo } from "./EventListenerDemo.js";
import { IntervalDemo } from "./IntervalDemo.js";
import { AbortControllerDemo } from "./AbortControllerDemo.js";
import { CombinedResourceDemo } from "./CombinedResourceDemo.js";

const ToggleSection = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.ReactNode => {
  const [visible, setVisible] = useState(true);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => {
            setVisible((v) => !v);
          }}
          style={{
            padding: "4px 12px",
            background: visible ? "#ff4444" : "#44bb44",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {visible ? "Unmount" : "Mount"}
        </button>
        <span style={{ fontWeight: "bold", color: "#ccc" }}>{title}</span>
        {!visible && (
          <span style={{ fontSize: 12, color: "#888" }}>
            (unmounted — resources cleaned up)
          </span>
        )}
      </div>
      {visible && children}
    </div>
  );
};

export const App = (): React.ReactNode => (
  <EffectProvider layer={Layer.empty}>
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
      <h1>Resource Cleanup with useEffectScope</h1>
      <p style={{ color: "#aaa", marginBottom: 24 }}>
        This example demonstrates how <code>useEffectScope</code> manages
        resource cleanup. Each demo registers resources (event listeners,
        intervals, abort controllers) as Scope finalizers. Click{" "}
        <strong>Unmount</strong> to see resources automatically cleaned up.
      </p>

      <ToggleSection title="1. EventListener">
        <EventListenerDemo />
      </ToggleSection>

      <ToggleSection title="2. Interval Timer">
        <IntervalDemo />
      </ToggleSection>

      <ToggleSection title="3. AbortController">
        <AbortControllerDemo />
      </ToggleSection>

      <ToggleSection title="4. Combined Resources">
        <CombinedResourceDemo />
      </ToggleSection>
    </div>
  </EffectProvider>
);
