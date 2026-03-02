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

  describe("nested providers (Layer composition)", () => {
    it("child provider merges parent layer - accesses both services", async () => {
      class ServiceA extends Effect.Tag("ServiceA")<
        ServiceA,
        { readonly value: string }
      >() {}

      class ServiceB extends Effect.Tag("ServiceB")<
        ServiceB,
        { readonly value: string }
      >() {}

      const parentLayer = Layer.succeed(ServiceA, { value: "from-parent" });
      const childLayer = Layer.succeed(ServiceB, { value: "from-child" });

      const capturedValues: Array<{ readonly a: string; readonly b: string }> =
        [];

      const Consumer = () => {
        const rt = useEffectRuntime<ServiceA | ServiceB, never>();
        void rt
          .runPromise(
            Effect.gen(function* () {
              const a = yield* ServiceA;
              const b = yield* ServiceB;
              return { a: a.value, b: b.value };
            }),
          )
          .then((v) => {
            capturedValues.push(v);
          });
        return null;
      };

      render(
        <EffectProvider layer={parentLayer}>
          <EffectProvider layer={childLayer}>
            <Consumer />
          </EffectProvider>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(capturedValues.length).toBeGreaterThanOrEqual(1);
      });

      const captured = capturedValues.at(-1);
      expect(captured).toBeDefined();
      if (captured === undefined) throw new Error("unreachable");
      expect(captured.a).toBe("from-parent");
      expect(captured.b).toBe("from-child");
    });

    it("child provider overrides parent service with same tag", async () => {
      class ServiceA extends Effect.Tag("ServiceA_Override")<
        ServiceA,
        { readonly value: number }
      >() {}

      const parentLayer = Layer.succeed(ServiceA, { value: 1 });
      const childLayer = Layer.succeed(ServiceA, { value: 2 });

      const capturedValues: number[] = [];

      const Consumer = () => {
        const rt = useEffectRuntime<ServiceA, never>();
        void rt.runPromise(Effect.map(ServiceA, (s) => s.value)).then((v) => {
          capturedValues.push(v);
        });
        return null;
      };

      render(
        <EffectProvider layer={parentLayer}>
          <EffectProvider layer={childLayer}>
            <Consumer />
          </EffectProvider>
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(capturedValues.length).toBeGreaterThanOrEqual(1);
      });

      // Child layer overrides parent: value should be 2
      expect(capturedValues.at(-1)).toBe(2);
    });

    it("child provider disposes independently from parent", async () => {
      class ServiceA extends Effect.Tag("ServiceA_Dispose")<
        ServiceA,
        { readonly value: string }
      >() {}

      class ServiceB extends Effect.Tag("ServiceB_Dispose")<
        ServiceB,
        { readonly value: string }
      >() {}

      const parentLayer = Layer.succeed(ServiceA, { value: "parent" });
      const childLayer = Layer.succeed(ServiceB, { value: "child" });

      const capturedChildRts: EffectManagedRuntime<
        ServiceA | ServiceB,
        never
      >[] = [];
      const capturedParentRts: EffectManagedRuntime<ServiceA, never>[] = [];

      const ChildConsumer = () => {
        const rt = useEffectRuntime<ServiceA | ServiceB, never>();
        if (
          capturedChildRts.length === 0 ||
          capturedChildRts[capturedChildRts.length - 1] !== rt
        ) {
          capturedChildRts.push(rt);
        }
        return null;
      };

      const ParentConsumer = () => {
        const rt = useEffectRuntime<ServiceA, never>();
        if (
          capturedParentRts.length === 0 ||
          capturedParentRts[capturedParentRts.length - 1] !== rt
        ) {
          capturedParentRts.push(rt);
        }
        return null;
      };

      const ChildWrapper = ({ showChild }: { readonly showChild: boolean }) => (
        <EffectProvider layer={parentLayer}>
          <ParentConsumer />
          {showChild ? (
            <EffectProvider layer={childLayer}>
              <ChildConsumer />
            </EffectProvider>
          ) : null}
        </EffectProvider>
      );

      const { rerender } = render(<ChildWrapper showChild={true} />);

      // Wait for both runtimes
      await vi.waitFor(() => {
        expect(capturedChildRts.length).toBeGreaterThanOrEqual(1);
        expect(capturedParentRts.length).toBeGreaterThanOrEqual(1);
      });

      const capturedChildRt = capturedChildRts.at(-1);
      expect(capturedChildRt).toBeDefined();
      if (capturedChildRt === undefined) throw new Error("unreachable");

      // Child runtime works
      const childValue = await capturedChildRt.runPromise(
        Effect.map(ServiceB, (s) => s.value),
      );
      expect(childValue).toBe("child");

      // Unmount child provider
      rerender(<ChildWrapper showChild={false} />);

      // Child runtime should be disposed
      await expect(
        capturedChildRt.runPromise(Effect.succeed(1)),
      ).rejects.toThrow();

      // Parent runtime should still work
      const capturedParentRt = capturedParentRts.at(-1);
      expect(capturedParentRt).toBeDefined();
      if (capturedParentRt === undefined) throw new Error("unreachable");
      const parentValue = await capturedParentRt.runPromise(
        Effect.map(ServiceA, (s) => s.value),
      );
      expect(parentValue).toBe("parent");
    });

    it("test layer replaces production service (DI mock pattern)", async () => {
      class ApiService extends Effect.Tag("ApiService_Test")<
        ApiService,
        { readonly fetch: (url: string) => Effect.Effect<string> }
      >() {}

      const productionLayer = Layer.succeed(ApiService, {
        fetch: (url) => Effect.succeed(`production: ${url satisfies string}`),
      });

      const testLayer = Layer.succeed(ApiService, {
        fetch: (url) => Effect.succeed(`mocked: ${url satisfies string}`),
      });

      const capturedValues: string[] = [];

      const Consumer = () => {
        const rt = useEffectRuntime<ApiService, never>();
        void rt
          .runPromise(
            Effect.gen(function* () {
              const api = yield* ApiService;
              return yield* api.fetch("/data");
            }),
          )
          .then((v) => {
            capturedValues.push(v);
          });
        return null;
      };

      // Use test layer instead of production layer
      render(
        <EffectProvider layer={testLayer}>
          <Consumer />
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(capturedValues.length).toBeGreaterThanOrEqual(1);
      });

      expect(capturedValues.at(-1)).toBe("mocked: /data");

      // Now verify with production layer would give different result
      const productionValues: string[] = [];

      const ProductionConsumer = () => {
        const rt = useEffectRuntime<ApiService, never>();
        void rt
          .runPromise(
            Effect.gen(function* () {
              const api = yield* ApiService;
              return yield* api.fetch("/data");
            }),
          )
          .then((v) => {
            productionValues.push(v);
          });
        return null;
      };

      render(
        <EffectProvider layer={productionLayer}>
          <ProductionConsumer />
        </EffectProvider>,
      );

      await vi.waitFor(() => {
        expect(productionValues.length).toBeGreaterThanOrEqual(1);
      });

      expect(productionValues.at(-1)).toBe("production: /data");
    });
  });
});
