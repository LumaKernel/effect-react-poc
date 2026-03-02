import { describe, it, expect, vi } from "vitest";
import { Effect, ManagedRuntime, Layer } from "effect";
import { createEffectStore } from "../src/EffectStore.js";
import { createEffectObserver } from "../src/EffectObserver.js";
import { initial, success } from "../src/EffectResult.js";

/**
 * Helper: create a store with a simple runtime (no services).
 */
const createTestStore = (config?: { readonly gcTime?: number }) => {
  const runtime = ManagedRuntime.make(Layer.empty);
  const store = createEffectStore(runtime, config);
  return { store, runtime };
};

describe("EffectObserver", () => {
  describe("getSnapshot before subscribe", () => {
    it("returns Initial before any subscription", () => {
      const { store } = createTestStore();
      const observer = createEffectObserver(store, "key", Effect.succeed(42));
      expect(observer.getSnapshot()).toEqual(initial);
    });
  });

  describe("lazy acquisition", () => {
    it("first subscribe triggers effect execution", async () => {
      const { store, runtime } = createTestStore();
      const observer = createEffectObserver(store, "key", Effect.succeed(42));

      // Before subscribe: should be Initial
      expect(observer.getSnapshot()).toEqual(initial);

      // Subscribe triggers the effect
      observer.subscribe(() => {});

      await vi.waitFor(() => {
        expect(observer.getSnapshot()).toEqual(success(42));
      });

      await runtime.dispose();
    });

    it("second subscribe does not re-execute the effect", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;
      const effect = Effect.sync(() => {
        callCount++;
        return callCount;
      });
      const observer = createEffectObserver(store, "key", effect);

      observer.subscribe(() => {});

      await vi.waitFor(() => {
        expect(observer.getSnapshot()).toEqual(success(1));
      });

      // Second subscribe should NOT trigger re-execution
      observer.subscribe(() => {});

      // Wait a tick and ensure callCount is still 1
      await vi.waitFor(() => {
        expect(callCount).toBe(1);
      });
      expect(observer.getSnapshot()).toEqual(success(1));

      await runtime.dispose();
    });
  });

  describe("snapshot transition sequence", () => {
    it("transitions Initial → Pending → Success for async effect", async () => {
      const { store, runtime } = createTestStore();
      const observer = createEffectObserver(
        store,
        "key",
        Effect.gen(function* () {
          yield* Effect.sleep("10 millis");
          return "done";
        }),
      );

      const collected: string[] = [];
      // Record initial state
      collected.push(observer.getSnapshot()._tag);

      observer.subscribe(() => {
        collected.push(observer.getSnapshot()._tag);
      });

      // After subscribe, should transition to Pending
      expect(observer.getSnapshot()._tag).toBe("Pending");

      await vi.waitFor(() => {
        expect(observer.getSnapshot()).toEqual(success("done"));
      });

      expect(collected).toContain("Initial");
      expect(collected).toContain("Pending");
      expect(collected).toContain("Success");

      await runtime.dispose();
    });
  });

  describe("error handling", () => {
    it("transitions to Failure on Effect.fail", async () => {
      const { store, runtime } = createTestStore();
      const observer = createEffectObserver(store, "key", Effect.fail("oops"));

      observer.subscribe(() => {});

      await vi.waitFor(() => {
        const result = observer.getSnapshot();
        expect(result._tag).toBe("Failure");
      });

      await runtime.dispose();
    });
  });

  describe("unsubscribe and cleanup", () => {
    it("last unsubscribe triggers GC schedule on the store", async () => {
      vi.useFakeTimers();
      try {
        const { store, runtime } = createTestStore({ gcTime: 100 });
        const observer = createEffectObserver(store, "key", Effect.succeed(42));

        const unsub = observer.subscribe(() => {});

        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(observer.getSnapshot()).toEqual(success(42));
        });

        // Unsubscribe should trigger GC schedule
        unsub();

        // Before grace period: entry should still exist
        expect(store.getSnapshot("key")).toEqual(success(42));

        // After grace period: entry should be cleaned up
        vi.advanceTimersByTime(100);
        expect(store.getSnapshot("key")).toEqual(initial);

        await runtime.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it("re-subscribe within grace period does not re-execute", async () => {
      vi.useFakeTimers();
      try {
        const { store, runtime } = createTestStore({ gcTime: 100 });
        let callCount = 0;
        const effect = Effect.sync(() => {
          callCount++;
          return callCount;
        });
        const observer = createEffectObserver(store, "key", effect);

        const unsub1 = observer.subscribe(() => {});

        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(observer.getSnapshot()).toEqual(success(1));
        });

        // Unsubscribe
        unsub1();
        expect(callCount).toBe(1);

        // Re-subscribe within grace period
        vi.advanceTimersByTime(50);
        const unsub2 = observer.subscribe(() => {});

        // Should NOT re-execute (data is still cached)
        expect(callCount).toBe(1);
        expect(observer.getSnapshot()).toEqual(success(1));

        // Wait past grace period — entry should persist because we re-subscribed
        vi.advanceTimersByTime(100);
        expect(observer.getSnapshot()).toEqual(success(1));

        unsub2();
        await runtime.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it("re-subscribe after GC cleanup re-executes the effect", async () => {
      vi.useFakeTimers();
      try {
        const { store, runtime } = createTestStore({ gcTime: 100 });
        let callCount = 0;
        const effect = Effect.sync(() => {
          callCount++;
          return callCount;
        });
        const observer = createEffectObserver(store, "key", effect);

        const unsub1 = observer.subscribe(() => {});

        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(observer.getSnapshot()).toEqual(success(1));
        });

        // Unsubscribe and let GC run
        unsub1();
        vi.advanceTimersByTime(100);
        expect(store.getSnapshot("key")).toEqual(initial);

        // Re-subscribe should re-execute
        observer.subscribe(() => {});

        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(observer.getSnapshot()).toEqual(success(2));
        });
        expect(callCount).toBe(2);

        await runtime.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it("double unsubscribe is safe", async () => {
      const { store, runtime } = createTestStore();
      const observer = createEffectObserver(store, "key", Effect.succeed(42));

      const unsub = observer.subscribe(() => {});
      unsub();
      unsub(); // should not throw

      await runtime.dispose();
    });
  });

  describe("multiple subscribers", () => {
    it("all subscribers are notified", async () => {
      const { store, runtime } = createTestStore();
      const observer = createEffectObserver(store, "key", Effect.succeed(42));

      const cb1 = vi.fn();
      const cb2 = vi.fn();
      observer.subscribe(cb1);
      observer.subscribe(cb2);

      await vi.waitFor(() => {
        expect(observer.getSnapshot()).toEqual(success(42));
      });

      expect(cb1.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(cb2.mock.calls.length).toBeGreaterThanOrEqual(1);

      await runtime.dispose();
    });

    it("unsubscribing one does not affect others", async () => {
      const { store, runtime } = createTestStore({ gcTime: 0 });
      const observer = createEffectObserver(store, "key", Effect.succeed(42));

      const cb1 = vi.fn();
      const unsub1 = observer.subscribe(cb1);
      observer.subscribe(() => {});

      await vi.waitFor(() => {
        expect(observer.getSnapshot()).toEqual(success(42));
      });

      // Unsubscribe first subscriber
      unsub1();

      // Entry should still exist because second subscriber is active
      expect(store.getSnapshot("key")).toEqual(success(42));

      await runtime.dispose();
    });
  });
});
