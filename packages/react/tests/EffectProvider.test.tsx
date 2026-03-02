/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Layer, Effect } from "effect";
import type { EffectManagedRuntime } from "../src/EffectProvider.js";
import {
  EffectProvider,
  useEffectRuntime,
  useEffectStore,
} from "../src/EffectProvider.js";

describe("EffectProvider", () => {
  describe("useEffectRuntime", () => {
    it("throws when used outside of EffectProvider", () => {
      // Suppress React error boundary console output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() => renderHook(() => useEffectRuntime())).toThrow(
        "useEffectRuntime must be used within an EffectProvider",
      );
      consoleSpy.mockRestore();
    });

    it("returns runtime when used within EffectProvider", async () => {
      const layer = Layer.empty;
      const wrapper = ({ children }: { readonly children: ReactNode }) => (
        <EffectProvider layer={layer}>{children}</EffectProvider>
      );

      // First render returns null (runtime not yet created)
      const { result, rerender } = renderHook(() => useEffectRuntime(), {
        wrapper,
      });

      // After useEffect runs, the runtime is available
      await vi.waitFor(() => {
        rerender();
        expect(result.current).not.toBeNull();
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current.runFork).toBe("function");
      expect(typeof result.current.runSync).toBe("function");
      expect(typeof result.current.runPromise).toBe("function");
      expect(typeof result.current.dispose).toBe("function");
    });
  });

  describe("useEffectStore", () => {
    it("throws when used outside of EffectProvider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() => renderHook(() => useEffectStore())).toThrow(
        "useEffectStore must be used within an EffectProvider",
      );
      consoleSpy.mockRestore();
    });
  });

  describe("runtime lifecycle", () => {
    it("disposes runtime on unmount", async () => {
      const layer = Layer.empty;
      const wrapper = ({ children }: { readonly children: ReactNode }) => (
        <EffectProvider layer={layer}>{children}</EffectProvider>
      );

      const { result, unmount, rerender } = renderHook(
        () => useEffectRuntime(),
        { wrapper },
      );

      // Wait for runtime to be created
      await vi.waitFor(() => {
        rerender();
        expect(result.current).not.toBeNull();
      });

      const runtime = result.current;

      // Verify runtime works before unmount
      const value = await runtime.runPromise(Effect.succeed(42));
      expect(value).toBe(42);

      // Unmount triggers dispose
      unmount();

      // After dispose, running an effect should fail
      await expect(runtime.runPromise(Effect.succeed(1))).rejects.toThrow();
    });

    it("disposes old runtime and creates new one when layer changes", async () => {
      class CounterService extends Effect.Tag("CounterService")<
        CounterService,
        { readonly value: number }
      >() {}

      const layer1 = Layer.succeed(CounterService, { value: 1 });
      const layer2 = Layer.succeed(CounterService, { value: 2 });

      // Track runtimes captured from the hook
      const capturedRuntimes: EffectManagedRuntime<CounterService, never>[] =
        [];

      const RuntimeCapture = ({
        onRuntime,
      }: {
        readonly onRuntime: (
          rt: EffectManagedRuntime<CounterService, never>,
        ) => void;
      }) => {
        const rt = useEffectRuntime<CounterService, never>();
        onRuntime(rt);
        return null;
      };

      const { rerender } = render(
        <EffectProvider layer={layer1}>
          <RuntimeCapture
            onRuntime={(rt) => {
              if (
                capturedRuntimes.length === 0 ||
                capturedRuntimes[capturedRuntimes.length - 1] !== rt
              ) {
                capturedRuntimes.push(rt);
              }
            }}
          />
        </EffectProvider>,
      );

      // Wait for first runtime to be captured
      await vi.waitFor(() => {
        expect(capturedRuntimes.length).toBeGreaterThanOrEqual(1);
      });

      const firstRuntime = capturedRuntimes.at(-1);
      expect(firstRuntime).toBeDefined();
      if (firstRuntime === undefined) throw new Error("unreachable");

      // Verify first runtime provides service value 1
      const value1 = await firstRuntime.runPromise(
        Effect.map(CounterService, (s) => s.value),
      );
      expect(value1).toBe(1);

      // Change the layer — triggers dispose of old runtime and creation of new one
      rerender(
        <EffectProvider layer={layer2}>
          <RuntimeCapture
            onRuntime={(rt) => {
              if (
                capturedRuntimes.length === 0 ||
                capturedRuntimes[capturedRuntimes.length - 1] !== rt
              ) {
                capturedRuntimes.push(rt);
              }
            }}
          />
        </EffectProvider>,
      );

      // Wait for new runtime to be captured
      await vi.waitFor(() => {
        expect(capturedRuntimes.length).toBeGreaterThanOrEqual(2);
      });

      const secondRuntime = capturedRuntimes.at(-1);
      expect(secondRuntime).toBeDefined();
      if (secondRuntime === undefined) throw new Error("unreachable");
      expect(secondRuntime).not.toBe(firstRuntime);

      // Old runtime should be disposed (running an effect fails)
      await expect(
        firstRuntime.runPromise(Effect.succeed(1)),
      ).rejects.toThrow();

      // New runtime provides service value 2
      const value2 = await secondRuntime.runPromise(
        Effect.map(CounterService, (s) => s.value),
      );
      expect(value2).toBe(2);
    });
  });

  describe("with services", () => {
    it("provides access to services defined in the layer", async () => {
      class Greeting extends Effect.Tag("Greeting")<
        Greeting,
        { readonly greet: (name: string) => Effect.Effect<string> }
      >() {
        static readonly Live = Layer.succeed(this, {
          greet: (name) => Effect.succeed(`Hello, ${name satisfies string}!`),
        });
      }

      const wrapper = ({ children }: { readonly children: ReactNode }) => (
        <EffectProvider layer={Greeting.Live}>{children}</EffectProvider>
      );

      const { result, rerender } = renderHook(() => useEffectRuntime(), {
        wrapper,
      });

      await vi.waitFor(() => {
        rerender();
        expect(result.current).not.toBeNull();
      });

      const message = await result.current.runPromise(
        Effect.gen(function* () {
          const greeting = yield* Greeting;
          return yield* greeting.greet("World");
        }),
      );

      expect(message).toBe("Hello, World!");
    });
  });
});
