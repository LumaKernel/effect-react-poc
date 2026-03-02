/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { Layer, Effect } from "effect";
import { EffectProvider } from "../src/EffectProvider.js";
import { useEffectScope } from "../src/useEffectScope.js";

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

describe("useEffectScope", () => {
  describe("basic behavior", () => {
    it("returns a ScopeHandle with addFinalizer", async () => {
      const { result, rerender } = renderHook(() => useEffectScope(), {
        wrapper,
      });

      await waitForProvider(rerender);

      expect(result.current).toHaveProperty("addFinalizer");
      expect(typeof result.current.addFinalizer).toBe("function");
    });

    it("allows registering a finalizer that runs on unmount", async () => {
      const finalizerFn = vi.fn();

      const { result, rerender, unmount } = renderHook(() => useEffectScope(), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Register a finalizer
      act(() => {
        result.current.addFinalizer(
          Effect.sync(() => {
            finalizerFn();
          }),
        );
      });

      // Finalizer should not have run yet
      expect(finalizerFn).not.toHaveBeenCalled();

      // Unmount
      unmount();

      // Finalizer should have run
      await vi.waitFor(() => {
        expect(finalizerFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("finalizer execution", () => {
    it("executes multiple finalizers on unmount", async () => {
      const finalizer1 = vi.fn();
      const finalizer2 = vi.fn();
      const finalizer3 = vi.fn();

      const { result, rerender, unmount } = renderHook(() => useEffectScope(), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Register multiple finalizers
      act(() => {
        result.current.addFinalizer(
          Effect.sync(() => {
            finalizer1();
          }),
        );
        result.current.addFinalizer(
          Effect.sync(() => {
            finalizer2();
          }),
        );
        result.current.addFinalizer(
          Effect.sync(() => {
            finalizer3();
          }),
        );
      });

      // None should have run yet
      expect(finalizer1).not.toHaveBeenCalled();
      expect(finalizer2).not.toHaveBeenCalled();
      expect(finalizer3).not.toHaveBeenCalled();

      // Unmount
      unmount();

      // All should have run
      await vi.waitFor(() => {
        expect(finalizer1).toHaveBeenCalledTimes(1);
        expect(finalizer2).toHaveBeenCalledTimes(1);
        expect(finalizer3).toHaveBeenCalledTimes(1);
      });
    });

    it("executes finalizers in reverse order (LIFO)", async () => {
      const executionOrder: readonly string[] & string[] = [];

      const { result, rerender, unmount } = renderHook(() => useEffectScope(), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Register finalizers in order: first, second, third
      act(() => {
        result.current.addFinalizer(
          Effect.sync(() => executionOrder.push("first")),
        );
        result.current.addFinalizer(
          Effect.sync(() => executionOrder.push("second")),
        );
        result.current.addFinalizer(
          Effect.sync(() => executionOrder.push("third")),
        );
      });

      // Unmount
      unmount();

      // Should execute in reverse order: third, second, first
      await vi.waitFor(() => {
        expect(executionOrder).toEqual(["third", "second", "first"]);
      });
    });
  });

  describe("scope lifecycle", () => {
    it("does not throw when unmounting with no finalizers", async () => {
      const { rerender, unmount } = renderHook(() => useEffectScope(), {
        wrapper,
      });

      await waitForProvider(rerender);

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it("addFinalizer after unmount is a no-op (does not throw)", async () => {
      const { result, rerender, unmount } = renderHook(() => useEffectScope(), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Save reference to addFinalizer before unmount
      const { addFinalizer } = result.current;

      unmount();

      // Calling addFinalizer after unmount should not throw
      expect(() => {
        addFinalizer(Effect.sync(() => {}));
      }).not.toThrow();
    });
  });

  describe("StrictMode compatibility", () => {
    it("works correctly under StrictMode", async () => {
      const finalizerFn = vi.fn();

      const strictWrapper = ({
        children,
      }: {
        readonly children: ReactNode;
      }) => (
        <StrictMode>
          <EffectProvider layer={Layer.empty}>{children}</EffectProvider>
        </StrictMode>
      );

      const { result, rerender, unmount } = renderHook(() => useEffectScope(), {
        wrapper: strictWrapper,
      });

      await waitForProvider(rerender);

      // Register a finalizer
      act(() => {
        result.current.addFinalizer(
          Effect.sync(() => {
            finalizerFn();
          }),
        );
      });

      expect(finalizerFn).not.toHaveBeenCalled();

      // Unmount
      unmount();

      // Finalizer should have run (may be called more than once in StrictMode due to double mount/unmount)
      await vi.waitFor(() => {
        expect(finalizerFn).toHaveBeenCalled();
      });
    });
  });
});
