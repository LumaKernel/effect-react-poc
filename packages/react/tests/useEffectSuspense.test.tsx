/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { Component, StrictMode, Suspense } from "react";
import { Layer, Effect, Cause } from "effect";
import { EffectProvider, useEffectStore } from "../src/EffectProvider.js";
import { EffectError, useEffectSuspense } from "../src/useEffectSuspense.js";

afterEach(() => {
  cleanup();
});

// --- Test Helpers ---

/**
 * ErrorBoundary component for testing Failure states.
 */
class ErrorBoundary extends Component<
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

describe("useEffectSuspense", () => {
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
          <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
            <SuspenseTestComponent queryKey="suspense-basic" effect={effect} />
          </Suspense>
        </EffectProvider>,
      );

      // Provider initializes via useEffect; Suspense shows fallback
      await vi.waitFor(() => {
        expect(screen.getByTestId("fallback")).toBeDefined();
      });

      expect(screen.getByTestId("fallback").textContent).toBe("Loading...");

      // Resolve the async effect
      act(() => {
        resolve("hello suspense");
      });

      // Should transition from fallback to resolved value
      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("hello suspense");
      });
    });

    it("shows resolved value for a sync effect after provider init", async () => {
      const effect = Effect.succeed("sync-value" as const).pipe(
        Effect.map((v): string => v),
      );

      render(
        <EffectProvider layer={Layer.empty}>
          <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
            <SuspenseTestComponent queryKey="suspense-sync" effect={effect} />
          </Suspense>
        </EffectProvider>,
      );

      // Sync effects resolve immediately once the provider is ready
      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("sync-value");
      });
    });
  });

  describe("ErrorBoundary integration", () => {
    it("catches EffectError when the effect fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const effect = Effect.fail("test-error");

      const ErrorFallback = ({ error }: { readonly error: unknown }) => {
        if (error instanceof EffectError) {
          return <div data-testid="error">EffectError caught</div>;
        }
        return <div data-testid="error">Unknown error</div>;
      };

      render(
        <EffectProvider layer={Layer.empty}>
          <ErrorBoundary fallback={(error) => <ErrorFallback error={error} />}>
            <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
              <SuspenseTestComponent
                queryKey="suspense-error"
                effect={effect}
              />
            </Suspense>
          </ErrorBoundary>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe(
          "EffectError caught",
        );
      });

      consoleSpy.mockRestore();
    });

    it("exposes Cause<E> from the EffectError", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const effect = Effect.fail("detailed-error");
      const capturedCauses: Cause.Cause<string>[] = [];

      const ErrorFallback = ({ error }: { readonly error: unknown }) => {
        if (error instanceof EffectError) {
          capturedCauses.push(error.cause as Cause.Cause<string>);
          return <div data-testid="error">caught</div>;
        }
        return <div data-testid="error">unknown</div>;
      };

      render(
        <EffectProvider layer={Layer.empty}>
          <ErrorBoundary fallback={(error) => <ErrorFallback error={error} />}>
            <Suspense fallback={<div>Loading</div>}>
              <SuspenseTestComponent
                queryKey="suspense-cause"
                effect={effect}
              />
            </Suspense>
          </ErrorBoundary>
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

  describe("Promise cache stability", () => {
    it("does not cause infinite suspend loops (promise is stable per key)", async () => {
      let resolve: (value: string) => void = () => {};
      const effect = Effect.async<string, string>((cb) => {
        resolve = (value: string) => {
          cb(Effect.succeed(value));
        };
      });

      let renderCount = 0;

      const CountingComponent = () => {
        renderCount++;
        const value = useEffectSuspense<string, string>(
          "promise-stable",
          effect,
        );
        return <div data-testid="result">{value}</div>;
      };

      render(
        <EffectProvider layer={Layer.empty}>
          <Suspense fallback={<div data-testid="fallback">Loading</div>}>
            <CountingComponent />
          </Suspense>
        </EffectProvider>,
      );

      // Wait for fallback
      await vi.waitFor(() => {
        expect(screen.queryByTestId("fallback")).not.toBeNull();
      });

      // Resolve
      act(() => {
        resolve("stable-value");
      });

      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("stable-value");
      });

      // Render count should be reasonable (not infinite loop).
      // With normal Suspense flow: suspended render(s) + final successful render.
      expect(renderCount).toBeLessThan(10);
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
            <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
              <SuspenseTestComponent
                queryKey="strict-suspense"
                effect={effect}
              />
            </Suspense>
          </EffectProvider>
        </StrictMode>,
      );

      // Wait for fallback
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

  describe("Success → Refreshing transition", () => {
    it("maintains value during Refreshing state (does not re-suspend)", async () => {
      let resolveRefresh: ((value: string) => void) | null = null;
      let callCount = 0;

      // First call resolves immediately; second call (invalidation) is async
      const makeEffect = () =>
        Effect.suspend(() => {
          callCount++;
          if (callCount === 1) {
            return Effect.succeed("first-value" as const).pipe(
              Effect.map((v): string => v),
            );
          }
          return Effect.async<string, string>((cb) => {
            resolveRefresh = (value: string) => {
              cb(Effect.succeed(value));
            };
          });
        });

      const InvalidateButton = ({
        queryKey,
      }: {
        readonly queryKey: string;
      }) => {
        const store = useEffectStore();
        return (
          <button
            data-testid="invalidate-btn"
            onClick={() => {
              store.invalidate(queryKey);
            }}
          >
            Invalidate
          </button>
        );
      };

      render(
        <EffectProvider layer={Layer.empty}>
          <InvalidateButton queryKey="refreshing-real" />
          <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
            <SuspenseTestComponent
              queryKey="refreshing-real"
              effect={makeEffect()}
            />
          </Suspense>
        </EffectProvider>,
      );

      // Wait for first success
      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("first-value");
      });

      // Trigger invalidation → Refreshing state
      act(() => {
        screen.getByTestId("invalidate-btn").click();
      });

      // During Refreshing, the old value should still be displayed (not fallback)
      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe("first-value");
      });

      // Resolve the refresh
      act(() => {
        if (resolveRefresh) {
          resolveRefresh("refreshed-value");
        }
      });

      // Should show the new value
      await vi.waitFor(() => {
        expect(screen.getByTestId("result").textContent).toBe(
          "refreshed-value",
        );
      });
    });
  });

  describe("EffectError class", () => {
    it("has correct properties", () => {
      const cause = Cause.fail("test");
      const error = new EffectError(cause);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EffectError);
      expect(error._tag).toBe("EffectError");
      expect(error.cause).toBe(cause);
      expect(error.message).toBe("Effect execution failed");
    });
  });
});
