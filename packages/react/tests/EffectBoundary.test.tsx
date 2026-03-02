/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { Component, StrictMode } from "react";
import { Layer, Effect, Cause } from "effect";
import { EffectProvider } from "../src/EffectProvider.js";
import { useEffectSuspense, EffectError } from "../src/useEffectSuspense.js";
import { EffectBoundary } from "../src/EffectBoundary.js";

afterEach(() => {
  cleanup();
});

// --- Test Helpers ---

const SuspenseTestComponent = ({
  queryKey,
  effect,
  testId = "result",
}: {
  readonly queryKey: string;
  readonly effect: Effect.Effect<string, string>;
  readonly testId?: string;
}) => {
  const value = useEffectSuspense<string, string>(queryKey, effect);
  return <div data-testid={testId}>{value}</div>;
};

/**
 * An ErrorBoundary that catches errors not handled by EffectBoundary,
 * used to verify error propagation.
 */
class OuterErrorBoundary extends Component<
  {
    readonly children: ReactNode;
    readonly fallback: (error: unknown) => ReactNode;
  },
  { readonly error: unknown }
> {
  constructor(props: {
    readonly children: ReactNode;
    readonly fallback: (error: unknown) => ReactNode;
  }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override render() {
    if (this.state.error !== null) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

describe("EffectBoundary", () => {
  describe("Suspense integration", () => {
    it("shows fallback while pending, then shows resolved value", async () => {
      let resolve: (value: string) => void = () => {};
      const effect = Effect.async<string, string>((cb) => {
        resolve = (value: string) => {
          cb(Effect.succeed(value));
        };
      });

      render(
        <EffectProvider layer={Layer.empty}>
          <EffectBoundary
            fallback={<div data-testid="fallback">Loading...</div>}
          >
            <SuspenseTestComponent queryKey="boundary-basic" effect={effect} />
          </EffectBoundary>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId("fallback")).toBeDefined();
      });

      expect(screen.getByTestId("fallback").textContent).toBe("Loading...");

      act(() => {
        resolve("boundary-value");
      });

      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("boundary-value");
      });
    });
  });

  describe("ErrorBoundary integration", () => {
    it("renders error with Cause<E> via renderError", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const effect = Effect.fail("typed-error");

      render(
        <EffectProvider layer={Layer.empty}>
          <EffectBoundary
            fallback={<div>Loading</div>}
            renderError={(cause: Cause.Cause<string>) => (
              <div data-testid="error">
                {Cause.isFailType(cause) ? cause.error : "unknown"}
              </div>
            )}
          >
            <SuspenseTestComponent queryKey="boundary-error" effect={effect} />
          </EffectBoundary>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe("typed-error");
      });

      consoleSpy.mockRestore();
    });

    it("provides Cause<E> that supports pattern matching", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const effect = Effect.fail("match-error");
      const capturedCauses: Cause.Cause<string>[] = [];

      render(
        <EffectProvider layer={Layer.empty}>
          <EffectBoundary
            fallback={<div>Loading</div>}
            renderError={(cause: Cause.Cause<string>) => {
              capturedCauses.push(cause);
              return <div data-testid="error">caught</div>;
            }}
          >
            <SuspenseTestComponent queryKey="boundary-cause" effect={effect} />
          </EffectBoundary>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId("error")).toBeDefined();
      });

      expect(capturedCauses.length).toBeGreaterThan(0);
      const firstCause = capturedCauses[0];
      expect(firstCause).toBeDefined();
      if (firstCause === undefined) throw new Error("unreachable");
      expect(Cause.failureOption(firstCause)).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe("error propagation without renderError", () => {
    it("propagates EffectError to parent ErrorBoundary when renderError is omitted", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const effect = Effect.fail("propagated-error");

      render(
        <EffectProvider layer={Layer.empty}>
          <OuterErrorBoundary
            fallback={(error) => (
              <div data-testid="outer-error">
                {error instanceof EffectError
                  ? "EffectError propagated"
                  : "other"}
              </div>
            )}
          >
            <EffectBoundary fallback={<div>Loading</div>}>
              <SuspenseTestComponent
                queryKey="boundary-propagate"
                effect={effect}
              />
            </EffectBoundary>
          </OuterErrorBoundary>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId("outer-error").textContent).toBe(
          "EffectError propagated",
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("nested boundaries", () => {
    it("inner boundary handles its own errors independently", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const successEffect = Effect.succeed("outer-value" as const).pipe(
        Effect.map((v): string => v),
      );
      const failEffect = Effect.fail("inner-error");

      render(
        <EffectProvider layer={Layer.empty}>
          <EffectBoundary
            fallback={<div data-testid="outer-fallback">Outer Loading</div>}
            renderError={() => <div data-testid="outer-error">Outer Error</div>}
          >
            <SuspenseTestComponent
              queryKey="nested-success"
              effect={successEffect}
              testId="outer-result"
            />
            <EffectBoundary
              fallback={<div data-testid="inner-fallback">Inner Loading</div>}
              renderError={(cause: Cause.Cause<string>) => (
                <div data-testid="inner-error">
                  {Cause.isFailType(cause) ? cause.error : "unknown"}
                </div>
              )}
            >
              <SuspenseTestComponent
                queryKey="nested-fail"
                effect={failEffect}
                testId="inner-result"
              />
            </EffectBoundary>
          </EffectBoundary>
        </EffectProvider>,
      );

      // Inner boundary should catch the error independently
      await vi.waitFor(() => {
        expect(screen.getByTestId("inner-error").textContent).toBe(
          "inner-error",
        );
      });

      // Outer component should show its value
      await vi.waitFor(() => {
        expect(screen.getByTestId("outer-result").textContent).toBe(
          "outer-value",
        );
      });

      // Outer error should NOT be triggered
      expect(screen.queryByTestId("outer-error")).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("non-EffectError handling", () => {
    it("re-throws non-EffectError to parent boundaries", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const ThrowingComponent = () => {
        throw new Error("plain-error");
      };

      render(
        <OuterErrorBoundary
          fallback={(error) => (
            <div data-testid="outer-error">
              {error instanceof Error ? error.message : "unknown"}
            </div>
          )}
        >
          <EffectBoundary
            fallback={<div>Loading</div>}
            renderError={() => (
              <div data-testid="inner-error">Should not appear</div>
            )}
          >
            <ThrowingComponent />
          </EffectBoundary>
        </OuterErrorBoundary>,
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId("outer-error").textContent).toBe(
          "plain-error",
        );
      });

      // Inner renderError should NOT be called for non-EffectError
      expect(screen.queryByTestId("inner-error")).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("StrictMode compatibility", () => {
    it("works correctly under StrictMode", async () => {
      let resolve: (value: string) => void = () => {};
      const effect = Effect.async<string, string>((cb) => {
        resolve = (value: string) => {
          cb(Effect.succeed(value));
        };
      });

      render(
        <StrictMode>
          <EffectProvider layer={Layer.empty}>
            <EffectBoundary
              fallback={<div data-testid="fallback">Loading...</div>}
              renderError={(cause: Cause.Cause<string>) => (
                <div data-testid="error">
                  {Cause.isFailType(cause) ? cause.error : "unknown"}
                </div>
              )}
            >
              <SuspenseTestComponent
                queryKey="strict-boundary"
                effect={effect}
              />
            </EffectBoundary>
          </EffectProvider>
        </StrictMode>,
      );

      await vi.waitFor(() => {
        expect(screen.queryByTestId("fallback")).not.toBeNull();
      });

      act(() => {
        resolve("strict-value");
      });

      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("strict-value");
      });
    });
  });
});
