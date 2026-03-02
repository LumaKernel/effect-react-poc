/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { Layer, Effect, Schedule } from "effect";
import { isInitial, isPending, isSuccess, isFailure } from "@effect-react/core";
import type { EffectResult } from "@effect-react/core";
import { EffectProvider } from "../src/EffectProvider.js";
import { useEffectQuery } from "../src/useEffectQuery.js";

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <EffectProvider layer={Layer.empty}>{children}</EffectProvider>
);

/**
 * Wait for the EffectProvider to initialize (runtime + store creation happens in useEffect).
 * Returns the rerender function for further use.
 */
const waitForProvider = async (rerender: () => void): Promise<void> => {
  await vi.waitFor(() => {
    rerender();
  });
};

describe("useEffectQuery", () => {
  describe("basic state transitions", () => {
    it("transitions from Initial → Pending → Success for a sync effect", async () => {
      const states: EffectResult<number, never>[] = [];

      const { result, rerender } = renderHook(
        () => useEffectQuery("sync-success", Effect.succeed(42)),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Collect states until we see Success
      await vi.waitFor(() => {
        rerender();
        const current = result.current;
        if (states.length === 0 || states[states.length - 1] !== current) {
          states.push(current);
        }
        expect(isSuccess(current)).toBe(true);
      });

      // The final state should be Success with value 42
      const final = result.current;
      expect(final._tag).toBe("Success");
      if (final._tag === "Success") {
        expect(final.value).toBe(42);
      }
    });

    it("transitions from Initial → Pending → Success for an async effect", async () => {
      let resolve: (value: number) => void = () => {};
      const effect = Effect.async<number>((cb) => {
        resolve = (value: number) => {
          cb(Effect.succeed(value));
        };
      });

      const { result, rerender } = renderHook(
        () => useEffectQuery("async-success", effect),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Should reach Pending state
      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current) || isInitial(result.current)).toBe(
          true,
        );
      });

      // Resolve the async effect
      act(() => {
        resolve(100);
      });

      // Should transition to Success
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current)).toBe(true);
      });

      const final = result.current;
      expect(final._tag).toBe("Success");
      if (final._tag === "Success") {
        expect(final.value).toBe(100);
      }
    });

    it("transitions to Failure for a failing effect", async () => {
      const { result, rerender } = renderHook(
        () =>
          useEffectQuery("failure-test", Effect.fail("test-error" as const)),
        { wrapper },
      );

      await waitForProvider(rerender);

      await vi.waitFor(() => {
        rerender();
        expect(isFailure(result.current)).toBe(true);
      });

      expect(result.current._tag).toBe("Failure");
    });
  });

  describe("key-based re-execution", () => {
    it("re-executes when key changes", async () => {
      let currentKey = "key-1";
      const effect1 = Effect.succeed("value-1");
      const effect2 = Effect.succeed("value-2");

      const { result, rerender } = renderHook(
        () =>
          useEffectQuery(
            currentKey,
            currentKey === "key-1" ? effect1 : effect2,
          ),
        { wrapper },
      );

      await waitForProvider(rerender);

      // First key should resolve to value-1
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current)).toBe(true);
      });

      if (result.current._tag === "Success") {
        expect(result.current.value).toBe("value-1");
      }

      // Change the key
      currentKey = "key-2";
      rerender();

      // Should eventually resolve to value-2
      await vi.waitFor(() => {
        rerender();
        if (result.current._tag === "Success") {
          expect(result.current.value).toBe("value-2");
        } else {
          throw new Error(
            `Expected Success, got ${result.current._tag satisfies string}`,
          );
        }
      });
    });
  });

  describe("cleanup", () => {
    it("cleans up on unmount", async () => {
      const { result, rerender, unmount } = renderHook(
        () => useEffectQuery("unmount-test", Effect.succeed("data")),
        { wrapper },
      );

      await waitForProvider(rerender);

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current)).toBe(true);
      });

      // Should not throw on unmount
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe("StrictMode compatibility", () => {
    it("works correctly under StrictMode", async () => {
      const strictWrapper = ({
        children,
      }: {
        readonly children: ReactNode;
      }) => (
        <StrictMode>
          <EffectProvider layer={Layer.empty}>{children}</EffectProvider>
        </StrictMode>
      );

      const { result, rerender } = renderHook(
        () => useEffectQuery("strict-mode", Effect.succeed("strict-value")),
        { wrapper: strictWrapper },
      );

      await waitForProvider(rerender);

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current)).toBe(true);
      });

      if (result.current._tag === "Success") {
        expect(result.current.value).toBe("strict-value");
      }
    });
  });

  describe("schedule option", () => {
    it("retries and shows Success after eventual success", async () => {
      let callCount = 0;

      const effect = Effect.gen(function* () {
        callCount++;
        if (callCount < 3) {
          return yield* Effect.fail("not yet");
        }
        return "retried-success";
      });

      const { result, rerender } = renderHook(
        () =>
          useEffectQuery("retry-test", effect, {
            schedule: Schedule.recurs(5),
          }),
        { wrapper },
      );

      await waitForProvider(rerender);

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current)).toBe(true);
      });

      if (result.current._tag === "Success") {
        expect(result.current.value).toBe("retried-success");
      }

      expect(callCount).toBe(3);
    });

    it("shows Failure after exhausting retries", async () => {
      const effect = Effect.fail("permanent-error" as const);

      const { result, rerender } = renderHook(
        () =>
          useEffectQuery("retry-exhaust", effect, {
            schedule: Schedule.recurs(2),
          }),
        { wrapper },
      );

      await waitForProvider(rerender);

      await vi.waitFor(() => {
        rerender();
        expect(isFailure(result.current)).toBe(true);
      });

      expect(result.current._tag).toBe("Failure");
    });
  });

  describe("shared cache", () => {
    it("shares data between components using the same key", async () => {
      const QueryDisplay = ({
        queryKey,
        testId,
      }: {
        readonly queryKey: string;
        readonly testId: string;
      }) => {
        const result = useEffectQuery(queryKey, Effect.succeed("shared-data"));
        return <div data-testid={testId}>{result._tag}</div>;
      };

      const { rerender } = render(
        <EffectProvider layer={Layer.empty}>
          <QueryDisplay queryKey="shared-key" testId="comp-1" />
          <QueryDisplay queryKey="shared-key" testId="comp-2" />
        </EffectProvider>,
      );

      // Both components should eventually show Success
      await vi.waitFor(() => {
        rerender(
          <EffectProvider layer={Layer.empty}>
            <QueryDisplay queryKey="shared-key" testId="comp-1" />
            <QueryDisplay queryKey="shared-key" testId="comp-2" />
          </EffectProvider>,
        );
        expect(screen.getByTestId("comp-1").textContent).toBe("Success");
        expect(screen.getByTestId("comp-2").textContent).toBe("Success");
      });
    });
  });
});
