/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { Layer, Effect } from "effect";
import { EffectProvider } from "../src/EffectProvider.js";
import { EffectValue } from "../src/EffectValue.js";

describe("EffectValue", () => {
  describe("fine-grained reactivity", () => {
    it("does not re-render parent when inner value changes", async () => {
      const parentRenderSpy = vi.fn();
      let resolve: (value: number) => void = () => {};
      const effect = Effect.async<number>((cb) => {
        resolve = (value: number) => {
          cb(Effect.succeed(value));
        };
      });

      const Parent = () => {
        parentRenderSpy();
        return (
          <EffectValue queryKey="parent-test" effect={effect}>
            {(result) => <div data-testid="result">{result._tag}</div>}
          </EffectValue>
        );
      };

      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <Parent />
        </EffectProvider>,
      );

      // Wait for provider initialization
      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <Parent />
          </EffectProvider>,
        );
      });

      // Record baseline render count after provider init
      const baselineCount = parentRenderSpy.mock.calls.length;

      // Resolve the async effect → triggers internal re-render in EffectValue
      act(() => {
        resolve(42);
      });

      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("Success");
      });

      // Parent should NOT have been re-rendered by the value change.
      // Only EffectValueInner (memoized) re-renders.
      expect(parentRenderSpy.mock.calls.length).toBe(baselineCount);
    });

    it("re-renders EffectValue subtree when value changes", async () => {
      const childRenderSpy = vi.fn();
      let resolve: (value: number) => void = () => {};
      const effect = Effect.async<number>((cb) => {
        resolve = (value: number) => {
          cb(Effect.succeed(value));
        };
      });

      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <EffectValue queryKey="child-render" effect={effect}>
            {(result) => {
              childRenderSpy();
              return <div data-testid="val">{result._tag}</div>;
            }}
          </EffectValue>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <EffectValue queryKey="child-render" effect={effect}>
              {(result) => {
                childRenderSpy();
                return <div data-testid="val">{result._tag}</div>;
              }}
            </EffectValue>
          </EffectProvider>,
        );
      });

      const countBeforeResolve = childRenderSpy.mock.calls.length;

      act(() => {
        resolve(99);
      });

      await vi.waitFor(() => {
        expect(screen.getByTestId("val").textContent).toBe("Success");
      });

      // Child render function should have been called again for the Success state
      expect(childRenderSpy.mock.calls.length).toBeGreaterThan(
        countBeforeResolve,
      );
    });
  });

  describe("EffectResult state rendering", () => {
    it("renders all states correctly through the lifecycle", async () => {
      let resolve: (value: string) => void = () => {};
      const effect = Effect.async<string>((cb) => {
        resolve = (value: string) => {
          cb(Effect.succeed(value));
        };
      });

      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <EffectValue queryKey="lifecycle" effect={effect}>
            {(result) => <div data-testid="state">{result._tag}</div>}
          </EffectValue>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <EffectValue queryKey="lifecycle" effect={effect}>
              {(result) => <div data-testid="state">{result._tag}</div>}
            </EffectValue>
          </EffectProvider>,
        );
      });

      // Should show Initial or Pending before resolution
      await vi.waitFor(() => {
        const tag = screen.getByTestId("state").textContent;
        expect(tag === "Initial" || tag === "Pending").toBe(true);
      });

      act(() => {
        resolve("hello");
      });

      await vi.waitFor(() => {
        expect(screen.getByTestId("state").textContent).toBe("Success");
      });
    });

    it("renders Failure state for a failing effect", async () => {
      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <EffectValue
            queryKey="failure-ev"
            effect={Effect.fail("err" as const)}
          >
            {(result) => <div data-testid="fail-state">{result._tag}</div>}
          </EffectValue>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <EffectValue
              queryKey="failure-ev"
              effect={Effect.fail("err" as const)}
            >
              {(result) => <div data-testid="fail-state">{result._tag}</div>}
            </EffectValue>
          </EffectProvider>,
        );
        expect(screen.getByTestId("fail-state").textContent).toBe("Failure");
      });
    });
  });

  describe("cache sharing", () => {
    it("shares cache between multiple EffectValue components with the same key", async () => {
      const effect = Effect.succeed("shared");

      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <EffectValue queryKey="shared-ev" effect={effect}>
            {(result) => <div data-testid="ev-1">{result._tag}</div>}
          </EffectValue>
          <EffectValue queryKey="shared-ev" effect={effect}>
            {(result) => <div data-testid="ev-2">{result._tag}</div>}
          </EffectValue>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <EffectValue queryKey="shared-ev" effect={effect}>
              {(result) => <div data-testid="ev-1">{result._tag}</div>}
            </EffectValue>
            <EffectValue queryKey="shared-ev" effect={effect}>
              {(result) => <div data-testid="ev-2">{result._tag}</div>}
            </EffectValue>
          </EffectProvider>,
        );
        expect(screen.getByTestId("ev-1").textContent).toBe("Success");
        expect(screen.getByTestId("ev-2").textContent).toBe("Success");
      });
    });
  });

  describe("parent state changes", () => {
    it("does not re-render EffectValue when unrelated parent state changes", async () => {
      const innerRenderSpy = vi.fn();

      const Parent = () => {
        const [count, setCount] = useState(0);
        return (
          <div>
            <button
              data-testid="inc"
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              {String(count)}
            </button>
            <EffectValue queryKey="unrelated" effect={Effect.succeed("stable")}>
              {(result) => {
                innerRenderSpy();
                return <div data-testid="inner">{result._tag}</div>;
              }}
            </EffectValue>
          </div>
        );
      };

      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <Parent />
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <Parent />
          </EffectProvider>,
        );
        expect(screen.getByTestId("inner").textContent).toBe("Success");
      });

      const countAfterSuccess = innerRenderSpy.mock.calls.length;

      // Click the button to trigger parent re-render with unrelated state change
      act(() => {
        screen.getByTestId("inc").click();
      });

      // EffectValue should NOT re-render because props haven't changed
      // and the inner component is memoized
      expect(innerRenderSpy.mock.calls.length).toBe(countAfterSuccess);
    });
  });

  describe("StrictMode compatibility", () => {
    it("works correctly under StrictMode", async () => {
      const { rerender } = render(
        <StrictMode>
          <EffectProvider layer={Layer.empty}>
            <EffectValue
              queryKey="strict-ev"
              effect={Effect.succeed("strict-val")}
            >
              {(result) => <div data-testid="strict">{result._tag}</div>}
            </EffectValue>
          </EffectProvider>
        </StrictMode>,
      );

      await vi.waitFor(() => {
        rerender(
          <StrictMode>
            <EffectProvider layer={Layer.empty}>
              <EffectValue
                queryKey="strict-ev"
                effect={Effect.succeed("strict-val")}
              >
                {(result) => <div data-testid="strict">{result._tag}</div>}
              </EffectValue>
            </EffectProvider>
          </StrictMode>,
        );
        expect(screen.getByTestId("strict").textContent).toBe("Success");
      });
    });
  });
});
