/**
 * SSR tests for all hooks using renderToString.
 * Runs in Node environment (no jsdom) so typeof window === "undefined".
 *
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Effect, Layer, Stream } from "effect";
import type { EffectProviderProps } from "../src/EffectProvider.js";
import { EffectProvider } from "../src/EffectProvider.js";
import { useEffectQuery } from "../src/useEffectQuery.js";
import { useEffectSuspense } from "../src/useEffectSuspense.js";
import { useEffectStream } from "../src/useEffectStream.js";
import { useEffectMutation } from "../src/useEffectMutation.js";

/**
 * Helper: create EffectProvider element for SSR tests.
 * Uses explicit type annotation to work around React.createElement inference
 * limitations with Layer.empty.
 */
const providerProps: Pick<EffectProviderProps<never, never>, "layer"> = {
  layer: Layer.empty,
};

const withProvider = (children: React.ReactNode): React.ReactElement =>
  React.createElement(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EffectProvider as React.FC<any>,
    providerProps,
    children,
  );

describe("SSR (renderToString)", () => {
  describe("EffectProvider", () => {
    it("renders children during SSR (state is null but isSSR is true)", () => {
      const html = renderToString(
        withProvider(
          React.createElement("div", { "data-testid": "child" }, "hello"),
        ),
      );
      expect(html).toContain("hello");
      expect(html).toContain("data-testid");
    });
  });

  describe("useEffectQuery", () => {
    it("returns Initial state during SSR via getServerSnapshot", () => {
      const results: string[] = [];

      const QueryComponent = () => {
        const result = useEffectQuery("ssr-key", Effect.succeed(42));
        results.push(result._tag);
        return React.createElement("div", null, result._tag);
      };

      const html = renderToString(
        withProvider(React.createElement(QueryComponent)),
      );

      expect(html).toContain("Initial");
      expect(results).toContain("Initial");
    });
  });

  describe("useEffectSuspense", () => {
    it("returns SSR fallback during SSR (Initial state, no promise to throw)", () => {
      const capturedValues: string[] = [];

      const SuspenseChild = () => {
        const value = useEffectSuspense("ssr-suspense", Effect.succeed("data"));
        // During SSR, value is undefined cast as A (no observer, no promise thrown).
        capturedValues.push(value);
        return React.createElement("div", null, "rendered");
      };

      const html = renderToString(
        withProvider(React.createElement(SuspenseChild)),
      );

      // SSR path: useEffectSuspense gets Initial, observer is null,
      // so no promise is created and undefined is returned as A.
      expect(html).toContain("rendered");
      // Runtime value is undefined even though type says string
      expect(capturedValues[0]).toBeUndefined();
    });
  });

  describe("useEffectStream", () => {
    it("returns Initial state during SSR via getServerSnapshot", () => {
      const results: string[] = [];

      const StreamComponent = () => {
        const { result } = useEffectStream(Stream.make(1, 2, 3));
        results.push(result._tag);
        return React.createElement("div", null, result._tag);
      };

      const html = renderToString(
        withProvider(React.createElement(StreamComponent)),
      );

      expect(html).toContain("Initial");
      expect(results).toContain("Initial");
    });
  });

  describe("useEffectMutation", () => {
    it("returns Initial state during SSR, mutate/reset are no-ops", () => {
      const results: string[] = [];

      const MutationComponent = () => {
        const { result, mutate, reset } = useEffectMutation((_input: string) =>
          Effect.succeed(42),
        );
        results.push(result._tag);
        // mutate and reset should be no-ops during SSR
        mutate("test");
        reset();
        return React.createElement("div", null, result._tag);
      };

      const html = renderToString(
        withProvider(React.createElement(MutationComponent)),
      );

      expect(html).toContain("Initial");
      expect(results).toContain("Initial");
    });
  });
});
