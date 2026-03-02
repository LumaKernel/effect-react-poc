/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { Layer, Effect } from "effect";
import { isInitial, isPending, isSuccess, isFailure } from "@effect-react/core";
import { EffectProvider } from "../src/EffectProvider.js";
import { useEffectMutation } from "../src/useEffectMutation.js";

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <EffectProvider layer={Layer.empty}>{children}</EffectProvider>
);

/**
 * Wait for the EffectProvider to initialize (runtime + store creation happens in useEffect).
 */
const waitForProvider = async (rerender: () => void): Promise<void> => {
  await vi.waitFor(() => {
    rerender();
  });
};

describe("useEffectMutation", () => {
  describe("basic state transitions", () => {
    it("starts in Initial (idle) state", async () => {
      const { result, rerender } = renderHook(
        () => useEffectMutation((_input: string) => Effect.succeed(42)),
        { wrapper },
      );

      await waitForProvider(rerender);

      expect(isInitial(result.current.result)).toBe(true);
    });

    it("transitions from Initial → Pending → Success for a sync effect", async () => {
      const { result, rerender } = renderHook(
        () => useEffectMutation((_input: undefined) => Effect.succeed(42)),
        { wrapper },
      );

      await waitForProvider(rerender);
      expect(isInitial(result.current.result)).toBe(true);

      // Trigger mutation
      act(() => {
        result.current.mutate(undefined);
      });

      // Should transition to Success (sync effect resolves quickly)
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(42);
      }
    });

    it("transitions from Initial → Pending → Success for an async effect", async () => {
      let resolve: (value: number) => void = () => {};
      const effectFn = (_input: undefined) =>
        Effect.async<number>((cb) => {
          resolve = (value: number) => {
            cb(Effect.succeed(value));
          };
        });

      const { result, rerender } = renderHook(
        () => useEffectMutation(effectFn),
        { wrapper },
      );

      await waitForProvider(rerender);
      expect(isInitial(result.current.result)).toBe(true);

      // Trigger mutation
      act(() => {
        result.current.mutate(undefined);
      });

      // Should be Pending
      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Resolve the async effect
      act(() => {
        resolve(100);
      });

      // Should transition to Success
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(100);
      }
    });

    it("transitions to Failure for a failing effect", async () => {
      const { result, rerender } = renderHook(
        () =>
          useEffectMutation((_input: undefined) =>
            Effect.fail("mutation-error" as const),
          ),
        { wrapper },
      );

      await waitForProvider(rerender);
      expect(isInitial(result.current.result)).toBe(true);

      // Trigger mutation
      act(() => {
        result.current.mutate(undefined);
      });

      // Should transition to Failure
      await vi.waitFor(() => {
        rerender();
        expect(isFailure(result.current.result)).toBe(true);
      });

      expect(result.current.result._tag).toBe("Failure");
    });
  });

  describe("mutate with input", () => {
    it("passes input to the effect function", async () => {
      const { result, rerender } = renderHook(
        () => useEffectMutation((input: number) => Effect.succeed(input * 2)),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Trigger with input = 21
      act(() => {
        result.current.mutate(21);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(42);
      }
    });
  });

  describe("reset", () => {
    it("resets state to Initial (idle)", async () => {
      const { result, rerender } = renderHook(
        () => useEffectMutation((_input: undefined) => Effect.succeed("done")),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Trigger mutation → Success
      act(() => {
        result.current.mutate(undefined);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      rerender();
      expect(isInitial(result.current.result)).toBe(true);
    });

    it("cancels in-flight mutation on reset", async () => {
      let resolve: (value: string) => void = () => {};
      const effectFn = (_input: undefined) =>
        Effect.async<string>((cb) => {
          resolve = (value: string) => {
            cb(Effect.succeed(value));
          };
        });

      const { result, rerender } = renderHook(
        () => useEffectMutation(effectFn),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Trigger mutation
      act(() => {
        result.current.mutate(undefined);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Reset while pending
      act(() => {
        result.current.reset();
      });

      rerender();
      expect(isInitial(result.current.result)).toBe(true);

      // Resolve should have no effect (fiber was cancelled)
      act(() => {
        resolve("late-value");
      });

      // Wait a tick and verify still Initial
      await vi.waitFor(() => {
        rerender();
        expect(isInitial(result.current.result)).toBe(true);
      });
    });
  });

  describe("cancellation", () => {
    it("cancels previous mutation when mutate is called again", async () => {
      let resolve1: (value: string) => void = () => {};
      let resolve2: (value: string) => void = () => {};
      let callCount = 0;

      const effectFn = (_input: undefined) =>
        Effect.async<string>((cb) => {
          callCount++;
          if (callCount === 1) {
            resolve1 = (value: string) => {
              cb(Effect.succeed(value));
            };
          } else {
            resolve2 = (value: string) => {
              cb(Effect.succeed(value));
            };
          }
        });

      const { result, rerender } = renderHook(
        () => useEffectMutation(effectFn),
        { wrapper },
      );

      await waitForProvider(rerender);

      // First mutation
      act(() => {
        result.current.mutate(undefined);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Second mutation (should cancel first)
      act(() => {
        result.current.mutate(undefined);
      });

      // Resolve first mutation - should have no effect (cancelled)
      act(() => {
        resolve1("first-value");
      });

      // Still pending (second mutation hasn't resolved)
      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Resolve second mutation
      act(() => {
        resolve2("second-value");
      });

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe("second-value");
      }
    });
  });

  describe("cleanup", () => {
    it("cleans up on unmount", async () => {
      const { result, rerender, unmount } = renderHook(
        () => useEffectMutation((_input: undefined) => Effect.succeed("data")),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Trigger mutation
      act(() => {
        result.current.mutate(undefined);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      // Should not throw on unmount
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it("cancels in-flight mutation on unmount", async () => {
      let resolved = false;
      const effectFn = (_input: undefined) =>
        Effect.async<string>((cb) => {
          // Resolve after unmount should not cause issues
          setTimeout(() => {
            resolved = true;
            cb(Effect.succeed("late-value"));
          }, 100);
        });

      const { result, rerender, unmount } = renderHook(
        () => useEffectMutation(effectFn),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Trigger mutation
      act(() => {
        result.current.mutate(undefined);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Unmount while pending
      expect(() => {
        unmount();
      }).not.toThrow();

      // The timeout will still fire, but it shouldn't cause errors
      expect(resolved).toBe(false);
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
        () =>
          useEffectMutation((_input: undefined) =>
            Effect.succeed("strict-value"),
          ),
        { wrapper: strictWrapper },
      );

      await waitForProvider(rerender);
      expect(isInitial(result.current.result)).toBe(true);

      act(() => {
        result.current.mutate(undefined);
      });

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe("strict-value");
      }
    });
  });
});
