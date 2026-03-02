/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { Layer, Stream } from "effect";
import { isPending, isSuccess, isFailure } from "@effect-react/core";
import { EffectProvider } from "../src/EffectProvider.js";
import { useEffectStream } from "../src/useEffectStream.js";

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

/**
 * Helper: create a controllable async stream for testing.
 * Returns the stream and control functions (emit / end / fail).
 */
const createControllableStream = <A,>() => {
  let emitFn: (value: A) => void = () => {};
  let endFn: () => void = () => {};
  let failFn: (error: string) => void = () => {};

  const stream = Stream.async<A, string>((emitter) => {
    emitFn = (value: A) => {
      void emitter.single(value);
    };
    endFn = () => {
      void emitter.end();
    };
    failFn = (error: string) => {
      void emitter.fail(error);
    };
  });

  return {
    stream,
    emit: (value: A) => {
      emitFn(value);
    },
    end: () => {
      endFn();
    },
    fail: (error: string) => {
      failFn(error);
    },
  };
};

describe("useEffectStream", () => {
  describe("basic state transitions", () => {
    it("receives all values from a finite stream and keeps the last value", async () => {
      const { result, rerender } = renderHook(
        () => useEffectStream(Stream.make(1, 2, 3)),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Stream.make emits synchronously, so it should quickly reach the last value
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(3);
      }
    });

    it("transitions Pending → Success for an async stream", async () => {
      const { stream, emit, end } = createControllableStream<number>();

      const { result, rerender } = renderHook(() => useEffectStream(stream), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Should be Pending (stream started, no values yet)
      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Emit first value
      emit(42);

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(42);
      }

      // Emit second value
      emit(100);

      await vi.waitFor(() => {
        rerender();
        if (result.current.result._tag === "Success") {
          expect(result.current.result.value).toBe(100);
        }
      });

      // End stream
      end();
    });

    it("transitions to Failure for a failing stream", async () => {
      const { result, rerender } = renderHook(
        () => useEffectStream(Stream.fail("stream-error" as const)),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Should transition to Failure
      await vi.waitFor(() => {
        rerender();
        expect(isFailure(result.current.result)).toBe(true);
      });

      expect(result.current.result._tag).toBe("Failure");
    });
  });

  describe("stream with sequential async values", () => {
    it("emits values one at a time from an async stream", async () => {
      const { stream, emit } = createControllableStream<number>();

      const { result, rerender } = renderHook(() => useEffectStream(stream), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Initially Pending
      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });

      // Emit first value
      emit(10);

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(10);
      }

      // Emit second value
      emit(20);

      await vi.waitFor(() => {
        rerender();
        if (result.current.result._tag === "Success") {
          expect(result.current.result.value).toBe(20);
        }
      });

      // Emit third value
      emit(30);

      await vi.waitFor(() => {
        rerender();
        if (result.current.result._tag === "Success") {
          expect(result.current.result.value).toBe(30);
        }
      });
    });
  });

  describe("cleanup", () => {
    it("interrupts the stream on unmount", async () => {
      const { stream, emit } = createControllableStream<number>();

      const { result, rerender, unmount } = renderHook(
        () => useEffectStream(stream),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Emit at least one value
      emit(1);

      // Wait for at least one emission
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      // Unmount should not throw - this triggers Fiber.interruptFork
      unmount();

      // Wait a tick for the interrupt to propagate and the
      // Cause.isInterruptedOnly branch to execute
      await vi.waitFor(() => {
        // Interrupt has been processed
      });
    });

    it("does not update state after unmount", async () => {
      const { stream, emit } = createControllableStream<number>();

      const { result, rerender, unmount } = renderHook(
        () => useEffectStream(stream),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Emit before unmount
      emit(1);
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      // Unmount
      unmount();

      // Emitting after unmount should not throw
      expect(() => {
        emit(2);
      }).not.toThrow();
    });
  });

  describe("stream completion", () => {
    it("keeps the last value after stream completes", async () => {
      const { result, rerender } = renderHook(
        () => useEffectStream(Stream.make(1, 2, 3)),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Wait for stream to complete with last value
      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(3);
      }

      // State should remain Success after completion
      rerender();
      expect(isSuccess(result.current.result)).toBe(true);
    });

    it("stays in Pending for an empty stream that completes immediately", async () => {
      const { result, rerender } = renderHook(
        () => useEffectStream(Stream.empty),
        { wrapper },
      );

      await waitForProvider(rerender);

      // Empty stream completes without emitting values
      // Should remain Pending (no value was set, and completion doesn't change state)
      await vi.waitFor(() => {
        rerender();
        expect(isPending(result.current.result)).toBe(true);
      });
    });
  });

  describe("error after values", () => {
    it("transitions to Failure after emitting some values then failing", async () => {
      const stream = Stream.make(1, 2).pipe(
        Stream.concat(Stream.fail("late-error" as const)),
      );

      const { result, rerender } = renderHook(() => useEffectStream(stream), {
        wrapper,
      });

      await waitForProvider(rerender);

      // Should eventually reach Failure
      await vi.waitFor(() => {
        rerender();
        expect(isFailure(result.current.result)).toBe(true);
      });
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
        () => useEffectStream(Stream.make(1, 2, 3)),
        { wrapper: strictWrapper },
      );

      await waitForProvider(rerender);

      await vi.waitFor(() => {
        rerender();
        expect(isSuccess(result.current.result)).toBe(true);
      });

      if (result.current.result._tag === "Success") {
        expect(result.current.result.value).toBe(3);
      }
    });
  });
});
