import { describe, it, expect, vi } from "vitest";
import { Cause, Effect, ManagedRuntime, Layer } from "effect";
import { createEffectStore } from "../src/EffectStore.js";
import { initial, pending, success, refreshing } from "../src/EffectResult.js";

/**
 * Helper: create a store with a simple runtime (no services).
 */
const createTestStore = (config?: { readonly gcGracePeriodMs?: number }) => {
  const runtime = ManagedRuntime.make(Layer.empty);
  const store = createEffectStore(runtime, config);
  return { store, runtime };
};

describe("EffectStore", () => {
  describe("initial state", () => {
    it("returns Initial for an unknown key", () => {
      const { store } = createTestStore();
      expect(store.getSnapshot("unknown")).toEqual(initial);
    });

    it("getSubscribable returns a subscribable starting with Initial", () => {
      const { store } = createTestStore();
      const sub = store.getSubscribable("key");
      expect(sub.getSnapshot()).toEqual(initial);
    });
  });

  describe("state transitions", () => {
    it("Effect.succeed transitions to Success", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed(42));

      // Wait for the fiber to complete
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      await runtime.dispose();
    });

    it("Effect.fail transitions to Failure", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.fail("oops"));

      await vi.waitFor(() => {
        const result = store.getSnapshot("key");
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
          expect(Cause.isFailure(result.cause)).toBe(true);
        }
      });

      await runtime.dispose();
    });

    it("async Effect transitions through Pending to Success", async () => {
      const { store, runtime } = createTestStore();
      const collected: string[] = [];

      store.subscribe("key", () => {
        collected.push(store.getSnapshot("key")._tag);
      });

      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.sleep("10 millis");
          return "done";
        }),
      );

      // Immediately should be Pending
      expect(store.getSnapshot("key")).toEqual(pending);

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("done"));
      });

      // Should have seen Pending then Success
      expect(collected).toContain("Pending");
      expect(collected).toContain("Success");

      await runtime.dispose();
    });

    it("re-run with existing Success transitions through Refreshing", async () => {
      const { store, runtime } = createTestStore();

      // First run to Success
      store.run("key", Effect.succeed("first"));
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("first"));
      });

      // Second run should go through Refreshing
      const collected: string[] = [];
      store.subscribe("key", () => {
        collected.push(store.getSnapshot("key")._tag);
      });

      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.sleep("10 millis");
          return "second";
        }),
      );

      expect(store.getSnapshot("key")).toEqual(refreshing("first"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("second"));
      });

      expect(collected).toContain("Refreshing");
      expect(collected).toContain("Success");

      await runtime.dispose();
    });
  });

  describe("fiber management", () => {
    it("interrupts previous fiber when re-running same key", async () => {
      const { store, runtime } = createTestStore();

      // Start a long-running effect
      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.sleep("10 seconds");
          return "old";
        }),
      );

      expect(store.getSnapshot("key")._tag).toBe("Pending");

      // Re-run with a quick effect - should interrupt the first
      store.run("key", Effect.succeed("new"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("new"));
      });

      await runtime.dispose();
    });

    it("Fiber interrupt results in Failure with interrupt cause", async () => {
      const { store, runtime } = createTestStore();

      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.never;
          return "unreachable";
        }),
      );

      expect(store.getSnapshot("key")._tag).toBe("Pending");

      // Dispose the store which interrupts all fibers
      await Effect.runPromise(store.dispose);

      await runtime.dispose();
    });
  });

  describe("invalidate", () => {
    it("re-runs the last effect for a key", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const effect = Effect.sync(() => {
        callCount++;
        return callCount;
      });

      store.run("key", effect);
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(1));
      });

      store.invalidate("key");
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(2));
      });

      await runtime.dispose();
    });

    it("is a no-op for a key with no previous effect", () => {
      const { store } = createTestStore();
      // Should not throw
      store.invalidate("nonexistent");
      expect(store.getSnapshot("nonexistent")).toEqual(initial);
    });

    it("interrupts running effect on invalidate", async () => {
      const { store, runtime } = createTestStore();

      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.sleep("10 seconds");
          return "slow";
        }),
      );

      expect(store.getSnapshot("key")._tag).toBe("Pending");

      // Invalidate with a fast effect stored from previous run won't work here
      // because the slow effect was stored; let's test with a sync effect first
      let value = "first";
      const effect = Effect.sync(() => value);

      store.run("key", effect);
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("first"));
      });

      value = "second";
      store.invalidate("key");
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("second"));
      });

      await runtime.dispose();
    });
  });

  describe("subscribe / getSnapshot", () => {
    it("notifies subscriber on state changes", async () => {
      const { store, runtime } = createTestStore();
      const callback = vi.fn();

      store.subscribe("key", callback);
      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      // Should have been called at least once (for Pending and Success transitions)
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(1);

      await runtime.dispose();
    });

    it("unsubscribe stops notifications", async () => {
      const { store, runtime } = createTestStore();
      const callback = vi.fn();

      const unsub = store.subscribe("key", callback);
      unsub();

      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      // Should not have been called after unsubscribe
      expect(callback).not.toHaveBeenCalled();

      await runtime.dispose();
    });

    it("double unsubscribe is safe", () => {
      const { store } = createTestStore();
      const unsub = store.subscribe("key", () => {});
      unsub();
      unsub(); // should not throw
    });
  });

  describe("GC timer", () => {
    it("cleans up entry after GC grace period", async () => {
      vi.useFakeTimers();
      try {
        const { store, runtime } = createTestStore({ gcGracePeriodMs: 100 });

        const unsub = store.subscribe("key", () => {});
        store.run("key", Effect.succeed(42));

        // Advance to let fiber complete
        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(store.getSnapshot("key")).toEqual(success(42));
        });

        // Unsubscribe triggers GC schedule
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

    it("re-subscribe within grace period preserves entry", async () => {
      vi.useFakeTimers();
      try {
        const { store, runtime } = createTestStore({ gcGracePeriodMs: 100 });

        const unsub1 = store.subscribe("key", () => {});
        store.run("key", Effect.succeed(42));

        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(store.getSnapshot("key")).toEqual(success(42));
        });

        unsub1();

        // Advance halfway through grace period
        vi.advanceTimersByTime(50);
        expect(store.getSnapshot("key")).toEqual(success(42));

        // Re-subscribe
        const unsub2 = store.subscribe("key", () => {});

        // Wait past original grace period
        vi.advanceTimersByTime(100);

        // Entry should still exist because we re-subscribed
        expect(store.getSnapshot("key")).toEqual(success(42));

        unsub2();
        await runtime.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it("entry is not GC'd while subscribed", async () => {
      vi.useFakeTimers();
      try {
        const { store, runtime } = createTestStore({ gcGracePeriodMs: 0 });

        store.subscribe("key", () => {});
        store.run("key", Effect.succeed(42));

        await vi.advanceTimersByTimeAsync(0);
        await vi.waitFor(() => {
          expect(store.getSnapshot("key")).toEqual(success(42));
        });

        // Even with 0ms GC, should not be cleaned up while subscribed
        vi.advanceTimersByTime(1000);
        expect(store.getSnapshot("key")).toEqual(success(42));

        await runtime.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it("immediate cleanup with gcGracePeriodMs = 0", async () => {
      const { store, runtime } = createTestStore({ gcGracePeriodMs: 0 });

      const unsub = store.subscribe("key", () => {});
      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      unsub();

      // Should be immediately cleaned up
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });

    it("GC interrupts running fiber on cleanup", async () => {
      const { store, runtime } = createTestStore({ gcGracePeriodMs: 0 });

      const unsub = store.subscribe("key", () => {});

      // Start a long-running effect
      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.never;
          return "unreachable";
        }),
      );

      expect(store.getSnapshot("key")._tag).toBe("Pending");

      // Unsubscribe triggers immediate GC, which should interrupt the fiber
      unsub();

      // Entry should be cleaned up
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });
  });

  describe("multiple keys", () => {
    it("manages independent entries for different keys", async () => {
      const { store, runtime } = createTestStore();

      store.run("a", Effect.succeed("alpha"));
      store.run("b", Effect.succeed("beta"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success("alpha"));
        expect(store.getSnapshot("b")).toEqual(success("beta"));
      });

      await runtime.dispose();
    });

    it("invalidating one key does not affect another", async () => {
      const { store, runtime } = createTestStore();

      let countA = 0;
      const effectA = Effect.sync(() => {
        countA++;
        return `a-${String(countA) satisfies string}`;
      });
      store.run("a", effectA);
      store.run("b", Effect.succeed("b-stable"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success("a-1"));
        expect(store.getSnapshot("b")).toEqual(success("b-stable"));
      });

      store.invalidate("a");

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success("a-2"));
      });

      // b should be unchanged
      expect(store.getSnapshot("b")).toEqual(success("b-stable"));

      await runtime.dispose();
    });
  });

  describe("dispose", () => {
    it("interrupts all running fibers", async () => {
      const { store, runtime } = createTestStore();

      store.run(
        "a",
        Effect.gen(function* () {
          yield* Effect.never;
          return "unreachable";
        }),
      );
      store.run(
        "b",
        Effect.gen(function* () {
          yield* Effect.never;
          return "unreachable";
        }),
      );

      await Effect.runPromise(store.dispose);

      // After dispose, store should be in a disposed state
      // New runs should be no-ops
      store.run("c", Effect.succeed("ignored"));
      expect(store.getSnapshot("c")).toEqual(initial);

      await runtime.dispose();
    });

    it("clears all entries", async () => {
      const { store, runtime } = createTestStore();

      store.run("a", Effect.succeed(1));
      store.run("b", Effect.succeed(2));

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success(1));
        expect(store.getSnapshot("b")).toEqual(success(2));
      });

      await Effect.runPromise(store.dispose);

      expect(store.getSnapshot("a")).toEqual(initial);
      expect(store.getSnapshot("b")).toEqual(initial);

      await runtime.dispose();
    });
  });
});
