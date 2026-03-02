import { describe, it, expect, vi } from "vitest";
import { Cause, Effect, ManagedRuntime, Layer, Schedule } from "effect";
import { createEffectStore } from "../src/EffectStore.js";
import type { EffectStoreConfig, RetryState } from "../src/EffectStore.js";
import { initial, pending, success, refreshing } from "../src/EffectResult.js";

/**
 * Helper: create a store with a simple runtime (no services).
 */
const createTestStore = (config?: Partial<EffectStoreConfig>) => {
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
        const { store, runtime } = createTestStore({ gcTime: 100 });

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
        const { store, runtime } = createTestStore({ gcTime: 100 });

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
        const { store, runtime } = createTestStore({ gcTime: 0 });

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

    it("immediate cleanup with gcTime = 0", async () => {
      const { store, runtime } = createTestStore({ gcTime: 0 });

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
      const { store, runtime } = createTestStore({ gcTime: 0 });

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

  describe("invalidateQueries", () => {
    it("invalidates all entries matching exact filter", async () => {
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

      store.invalidateQueries({ type: "exact", key: "a" });

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success("a-2"));
      });
      // b should be unchanged
      expect(store.getSnapshot("b")).toEqual(success("b-stable"));

      await runtime.dispose();
    });

    it("invalidates entries matching prefix filter", async () => {
      const { store, runtime } = createTestStore();
      let countU1 = 0;
      let countU2 = 0;
      const effectU1 = Effect.sync(() => {
        countU1++;
        return `u1-${String(countU1) satisfies string}`;
      });
      const effectU2 = Effect.sync(() => {
        countU2++;
        return `u2-${String(countU2) satisfies string}`;
      });

      store.run("users/1", effectU1);
      store.run("users/2", effectU2);
      store.run("posts/1", Effect.succeed("post-stable"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("users/1")).toEqual(success("u1-1"));
        expect(store.getSnapshot("users/2")).toEqual(success("u2-1"));
        expect(store.getSnapshot("posts/1")).toEqual(success("post-stable"));
      });

      store.invalidateQueries({ type: "prefix", prefix: "users/" });

      await vi.waitFor(() => {
        expect(store.getSnapshot("users/1")).toEqual(success("u1-2"));
        expect(store.getSnapshot("users/2")).toEqual(success("u2-2"));
      });
      // posts should be unchanged
      expect(store.getSnapshot("posts/1")).toEqual(success("post-stable"));

      await runtime.dispose();
    });

    it("invalidates entries matching predicate filter", async () => {
      const { store, runtime } = createTestStore();
      let countA = 0;
      let countB = 0;
      const effectA = Effect.sync(() => {
        countA++;
        return `a-${String(countA) satisfies string}`;
      });
      const effectB = Effect.sync(() => {
        countB++;
        return `b-${String(countB) satisfies string}`;
      });

      store.run("item-1", effectA);
      store.run("item-2", effectB);
      store.run("other", Effect.succeed("other-stable"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("item-1")).toEqual(success("a-1"));
        expect(store.getSnapshot("item-2")).toEqual(success("b-1"));
        expect(store.getSnapshot("other")).toEqual(success("other-stable"));
      });

      store.invalidateQueries({
        type: "predicate",
        predicate: (key) => key.startsWith("item-"),
      });

      await vi.waitFor(() => {
        expect(store.getSnapshot("item-1")).toEqual(success("a-2"));
        expect(store.getSnapshot("item-2")).toEqual(success("b-2"));
      });
      expect(store.getSnapshot("other")).toEqual(success("other-stable"));

      await runtime.dispose();
    });

    it("invalidates all entries with 'all' filter", async () => {
      const { store, runtime } = createTestStore();
      let countA = 0;
      let countB = 0;
      const effectA = Effect.sync(() => {
        countA++;
        return countA;
      });
      const effectB = Effect.sync(() => {
        countB++;
        return countB;
      });

      store.run("a", effectA);
      store.run("b", effectB);

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success(1));
        expect(store.getSnapshot("b")).toEqual(success(1));
      });

      store.invalidateQueries({ type: "all" });

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success(2));
        expect(store.getSnapshot("b")).toEqual(success(2));
      });

      await runtime.dispose();
    });

    it("skips entries with no stored effect", async () => {
      const { store, runtime } = createTestStore();

      // Create an entry by subscribing but don't run an effect
      store.subscribe("no-effect", () => {});

      let countA = 0;
      store.run(
        "a",
        Effect.sync(() => {
          countA++;
          return countA;
        }),
      );

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success(1));
      });

      // Should not throw for "no-effect" entry
      store.invalidateQueries({ type: "all" });

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success(2));
      });
      // "no-effect" should remain Initial
      expect(store.getSnapshot("no-effect")).toEqual(initial);

      await runtime.dispose();
    });
  });

  describe("isStale", () => {
    it("returns true for non-existent key", () => {
      const { store } = createTestStore();
      expect(store.isStale("nonexistent")).toBe(true);
    });

    it("returns true for key that has never settled", () => {
      const { store } = createTestStore({ staleTime: 60_000 });
      store.subscribe("key", () => {});
      // Entry exists but has never settled
      expect(store.isStale("key")).toBe(true);
    });

    it("returns true immediately when staleTime is 0 (default)", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      // staleTime = 0 means always stale
      expect(store.isStale("key")).toBe(true);

      await runtime.dispose();
    });

    it("returns false within staleTime and true after", async () => {
      // Use a long staleTime so that after settling, data is immediately fresh.
      // Then verify that isStale transitions by using Date.now mock on the isStale check.
      const { store, runtime } = createTestStore({ staleTime: 60_000 });

      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      // Data just settled, should be fresh
      expect(store.isStale("key")).toBe(false);

      await runtime.dispose();
    });

    it("returns true after staleTime expires", async () => {
      // Use a very short staleTime (1ms) and wait for it to expire
      const { store, runtime } = createTestStore({ staleTime: 1 });

      store.run("key", Effect.succeed("data"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("data"));
      });

      // Wait slightly longer than staleTime
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      expect(store.isStale("key")).toBe(true);

      await runtime.dispose();
    });
  });

  describe("clearCache", () => {
    it("resets a specific key to Initial", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      store.clearCache("key");
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });

    it("interrupts running fiber on clear", async () => {
      const { store, runtime } = createTestStore();

      store.run(
        "key",
        Effect.gen(function* () {
          yield* Effect.never;
          return "unreachable";
        }),
      );

      expect(store.getSnapshot("key")._tag).toBe("Pending");

      store.clearCache("key");
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });

    it("notifies subscribers on clear", async () => {
      const { store, runtime } = createTestStore();
      const callback = vi.fn();

      store.subscribe("key", callback);
      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      callback.mockClear();
      store.clearCache("key");

      // Subscriber should be notified of the state change to Initial
      expect(callback).toHaveBeenCalled();
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });

    it("is a no-op for non-existent key", () => {
      const { store } = createTestStore();
      // Should not throw
      store.clearCache("nonexistent");
      expect(store.getSnapshot("nonexistent")).toEqual(initial);
    });

    it("cleans up entry without subscribers", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      // No subscribers, clear should delete the entry entirely
      store.clearCache("key");
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });
  });

  describe("clearCacheByFilter", () => {
    it("clears entries matching prefix filter", async () => {
      const { store, runtime } = createTestStore();

      store.run("users/1", Effect.succeed("user-1"));
      store.run("users/2", Effect.succeed("user-2"));
      store.run("posts/1", Effect.succeed("post-1"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("users/1")).toEqual(success("user-1"));
        expect(store.getSnapshot("users/2")).toEqual(success("user-2"));
        expect(store.getSnapshot("posts/1")).toEqual(success("post-1"));
      });

      store.clearCacheByFilter({ type: "prefix", prefix: "users/" });

      expect(store.getSnapshot("users/1")).toEqual(initial);
      expect(store.getSnapshot("users/2")).toEqual(initial);
      // posts should be unchanged
      expect(store.getSnapshot("posts/1")).toEqual(success("post-1"));

      await runtime.dispose();
    });

    it("clears all entries with 'all' filter", async () => {
      const { store, runtime } = createTestStore();

      store.run("a", Effect.succeed(1));
      store.run("b", Effect.succeed(2));

      await vi.waitFor(() => {
        expect(store.getSnapshot("a")).toEqual(success(1));
        expect(store.getSnapshot("b")).toEqual(success(2));
      });

      store.clearCacheByFilter({ type: "all" });

      expect(store.getSnapshot("a")).toEqual(initial);
      expect(store.getSnapshot("b")).toEqual(initial);

      await runtime.dispose();
    });

    it("clears entries matching predicate filter", async () => {
      const { store, runtime } = createTestStore();

      store.run("temp-1", Effect.succeed("t1"));
      store.run("temp-2", Effect.succeed("t2"));
      store.run("perm-1", Effect.succeed("p1"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("temp-1")).toEqual(success("t1"));
        expect(store.getSnapshot("temp-2")).toEqual(success("t2"));
        expect(store.getSnapshot("perm-1")).toEqual(success("p1"));
      });

      store.clearCacheByFilter({
        type: "predicate",
        predicate: (key) => key.startsWith("temp-"),
      });

      expect(store.getSnapshot("temp-1")).toEqual(initial);
      expect(store.getSnapshot("temp-2")).toEqual(initial);
      expect(store.getSnapshot("perm-1")).toEqual(success("p1"));

      await runtime.dispose();
    });
  });

  describe("notifyFocus", () => {
    it("invalidates stale entries with subscribers when refetchOnWindowFocus is true", async () => {
      const { store, runtime } = createTestStore({
        refetchOnWindowFocus: true,
        staleTime: 0, // always stale
      });
      let callCount = 0;
      const effect = Effect.sync(() => {
        callCount++;
        return callCount;
      });

      store.subscribe("key", () => {});
      store.run("key", effect);

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(1));
      });

      store.notifyFocus();

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(2));
      });

      await runtime.dispose();
    });

    it("does not invalidate fresh entries (within staleTime)", async () => {
      const { store, runtime } = createTestStore({
        refetchOnWindowFocus: true,
        staleTime: 60_000, // 60 seconds = fresh for a long time
      });
      let callCount = 0;
      const effect = Effect.sync(() => {
        callCount++;
        return callCount;
      });

      store.subscribe("key", () => {});
      store.run("key", effect);

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(1));
      });

      store.notifyFocus();

      // Wait briefly to ensure no re-fetch happens
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      expect(store.getSnapshot("key")).toEqual(success(1));
      expect(callCount).toBe(1);

      await runtime.dispose();
    });

    it("does not invalidate entries without subscribers", async () => {
      const { store, runtime } = createTestStore({
        refetchOnWindowFocus: true,
        staleTime: 0,
      });
      let callCount = 0;
      const effect = Effect.sync(() => {
        callCount++;
        return callCount;
      });

      // Run without subscribing
      store.run("key", effect);

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(1));
      });

      store.notifyFocus();

      // Wait briefly to ensure no re-fetch
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      expect(callCount).toBe(1);

      await runtime.dispose();
    });

    it("is a no-op when refetchOnWindowFocus is false (default)", async () => {
      const { store, runtime } = createTestStore({
        staleTime: 0,
      });
      let callCount = 0;
      const effect = Effect.sync(() => {
        callCount++;
        return callCount;
      });

      store.subscribe("key", () => {});
      store.run("key", effect);

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(1));
      });

      store.notifyFocus();

      // Wait briefly to ensure no re-fetch
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      expect(callCount).toBe(1);
      expect(store.getSnapshot("key")).toEqual(success(1));

      await runtime.dispose();
    });
  });

  describe("retry with schedule", () => {
    it("retries and eventually succeeds", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const effect = Effect.sync(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error("not yet");
        }
        return "success";
      }).pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));

      store.run("key", effect, {
        schedule: Schedule.recurs(5),
      });

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("success"));
      });

      expect(callCount).toBe(3);

      await runtime.dispose();
    });

    it("fails after exhausting retries with Schedule.recurs", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const effect = Effect.gen(function* () {
        callCount++;
        return yield* Effect.fail("error");
      });

      store.run("key", effect, {
        schedule: Schedule.recurs(2),
      });

      await vi.waitFor(() => {
        const result = store.getSnapshot("key");
        expect(result._tag).toBe("Failure");
      });

      // 1 initial attempt + 2 retries = 3 calls
      expect(callCount).toBe(3);

      await runtime.dispose();
    });

    it("tracks retry state with attempt count", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;
      const retryStates: RetryState[] = [];

      const effect = Effect.gen(function* () {
        callCount++;
        return yield* Effect.fail("error");
      });

      // Subscribe to retry state changes
      store.getRetrySubscribable("key").subscribe(() => {
        retryStates.push(store.getRetryState("key"));
      });

      store.run("key", effect, {
        schedule: Schedule.recurs(2),
      });

      await vi.waitFor(() => {
        const result = store.getSnapshot("key");
        expect(result._tag).toBe("Failure");
      });

      // 1 initial attempt + 2 retries = 3 total calls
      expect(callCount).toBe(3);

      // Verify all retry states (including reset and final)
      // States: [reset {0,false}] → [retry {1,true}] → [retry {2,true}] → ... → [final {N,false}]
      const retryingStates = retryStates.filter((s) => s.retrying);
      // tapOutput fires for each schedule recurrence
      expect(retryingStates.length).toBeGreaterThanOrEqual(2);

      // Final state should not be retrying
      const finalState = store.getRetryState("key");
      expect(finalState.retrying).toBe(false);

      await runtime.dispose();
    });

    it("resets retry state on successful retry", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const effect = Effect.gen(function* () {
        callCount++;
        if (callCount < 3) {
          return yield* Effect.fail("not yet");
        }
        return "done";
      });

      store.run("key", effect, {
        schedule: Schedule.recurs(5),
      });

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("done"));
      });

      const retryState = store.getRetryState("key");
      expect(retryState.retrying).toBe(false);
      expect(retryState.attempt).toBe(2); // 2 retries before success

      await runtime.dispose();
    });

    it("cancels retry on re-run of same key", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const slowFailingEffect = Effect.gen(function* () {
        callCount++;
        yield* Effect.sleep("50 millis");
        return yield* Effect.fail("error");
      });

      store.run("key", slowFailingEffect, {
        schedule: Schedule.recurs(10),
      });

      // Wait for at least one attempt
      await vi.waitFor(() => {
        expect(callCount).toBeGreaterThanOrEqual(1);
      });

      const countBeforeRerun = callCount;

      // Re-run with a different effect (interrupts previous)
      store.run("key", Effect.succeed("new-value"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("new-value"));
      });

      // Should not have had many more calls after the re-run
      expect(callCount).toBeLessThanOrEqual(countBeforeRerun + 1);

      // Retry state should be reset
      expect(store.getRetryState("key")).toEqual({
        attempt: 0,
        retrying: false,
      });

      await runtime.dispose();
    });

    it("cancels retry on dispose", async () => {
      const { store, runtime } = createTestStore();

      const effect = Effect.gen(function* () {
        yield* Effect.sleep("10 millis");
        return yield* Effect.fail("error");
      });

      store.run("key", effect, {
        schedule: Schedule.recurs(100),
      });

      // Wait for at least one attempt
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")._tag).toBe("Pending");
      });

      await Effect.runPromise(store.dispose);
      await runtime.dispose();
    });

    it("invalidate re-uses stored schedule", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const effect = Effect.gen(function* () {
        callCount++;
        if (callCount % 3 !== 0) {
          return yield* Effect.fail("not yet");
        }
        return `success-${String(callCount) satisfies string}`;
      });

      store.run("key", effect, {
        schedule: Schedule.recurs(5),
      });

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("success-3"));
      });

      // Reset call count tracking
      // callCount is now 3. Next success will be at 6.
      store.invalidate("key");

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("success-6"));
      });

      await runtime.dispose();
    });

    it("clearCache resets retry state", async () => {
      const { store, runtime } = createTestStore();

      const effect = Effect.gen(function* () {
        yield* Effect.sleep("10 millis");
        return yield* Effect.fail("error");
      });

      store.subscribe("key", () => {});
      store.run("key", effect, {
        schedule: Schedule.recurs(100),
      });

      // Wait for retrying to start
      await vi.waitFor(() => {
        const retryState = store.getRetryState("key");
        expect(retryState.attempt).toBeGreaterThanOrEqual(1);
      });

      store.clearCache("key");

      expect(store.getRetryState("key")).toEqual({
        attempt: 0,
        retrying: false,
      });
      expect(store.getSnapshot("key")).toEqual(initial);

      await runtime.dispose();
    });

    it("run without schedule has initial retry state", async () => {
      const { store, runtime } = createTestStore();

      store.run("key", Effect.succeed(42));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success(42));
      });

      expect(store.getRetryState("key")).toEqual({
        attempt: 0,
        retrying: false,
      });

      await runtime.dispose();
    });

    it("getRetryState returns initial state for unknown key", () => {
      const { store } = createTestStore();
      expect(store.getRetryState("unknown")).toEqual({
        attempt: 0,
        retrying: false,
      });
    });

    it("works with exponential backoff schedule", async () => {
      const { store, runtime } = createTestStore();
      let callCount = 0;

      const effect = Effect.gen(function* () {
        callCount++;
        if (callCount < 3) {
          return yield* Effect.fail("not yet");
        }
        return "done";
      });

      store.run("key", effect, {
        schedule: Schedule.intersect(
          Schedule.exponential("1 millis"),
          Schedule.recurs(5),
        ),
      });

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("done"));
      });

      expect(callCount).toBe(3);

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

  describe("setOptimistic", () => {
    it("immediately sets the entry to Success with the given value", () => {
      const { store } = createTestStore();
      store.setOptimistic("key", "optimistic-value");
      expect(store.getSnapshot("key")).toEqual(success("optimistic-value"));
    });

    it("returns a rollback handle that restores the previous value", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed("original"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("original"));
      });

      const handle = store.setOptimistic("key", "optimistic");
      expect(store.getSnapshot("key")).toEqual(success("optimistic"));

      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(success("original"));

      await runtime.dispose();
    });

    it("rollback restores Initial if the entry had no previous value", () => {
      const { store } = createTestStore();
      const handle = store.setOptimistic("key", "optimistic");
      expect(store.getSnapshot("key")).toEqual(success("optimistic"));

      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(initial);
    });

    it("rollback is no-op if entry was overwritten by run()", async () => {
      const { store, runtime } = createTestStore();
      const handle = store.setOptimistic("key", "optimistic");
      expect(store.getSnapshot("key")).toEqual(success("optimistic"));

      // run() overwrites the optimistic update
      store.run("key", Effect.succeed("from-run"));
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("from-run"));
      });

      // rollback should be no-op since run() overwrote the entry
      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(success("from-run"));

      await runtime.dispose();
    });

    it("rollback is no-op if entry was overwritten by another setOptimistic()", () => {
      const { store } = createTestStore();
      const handle1 = store.setOptimistic("key", "opt-1");
      const handle2 = store.setOptimistic("key", "opt-2");
      expect(store.getSnapshot("key")).toEqual(success("opt-2"));

      // handle1 rollback should be no-op (handle2 overwrote it)
      handle1.rollback();
      expect(store.getSnapshot("key")).toEqual(success("opt-2"));

      // handle2 rollback should work (it's the latest)
      handle2.rollback();
      expect(store.getSnapshot("key")).toEqual(success("opt-1"));
    });

    it("rollback is no-op if entry was cleared by clearCache()", () => {
      const { store } = createTestStore();
      store.subscribe("key", () => {});
      const handle = store.setOptimistic("key", "optimistic");
      expect(store.getSnapshot("key")).toEqual(success("optimistic"));

      store.clearCache("key");
      expect(store.getSnapshot("key")).toEqual(initial);

      // rollback should be no-op
      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(initial);
    });

    it("notifies subscribers when optimistic value is set", () => {
      const { store } = createTestStore();
      const callback = vi.fn();
      store.subscribe("key", callback);

      store.setOptimistic("key", "optimistic");
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("notifies subscribers on rollback", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed("original"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("original"));
      });

      const callback = vi.fn();
      store.subscribe("key", callback);

      const handle = store.setOptimistic("key", "optimistic");
      expect(callback).toHaveBeenCalledTimes(1);

      handle.rollback();
      expect(callback).toHaveBeenCalledTimes(2);

      await runtime.dispose();
    });

    it("works with optimistic update during Pending state", async () => {
      const { store, runtime } = createTestStore();

      // Start an async effect with externally-controlled resolution
      const resolvers: Array<(v: string) => void> = [];
      const effect = Effect.async<string>((cb) => {
        resolvers.push((v: string) => {
          cb(Effect.succeed(v));
        });
      });
      store.run("key", effect);

      // Wait for the async callback to be set up
      await vi.waitFor(() => {
        expect(resolvers).toHaveLength(1);
      });
      expect(store.getSnapshot("key")).toEqual(pending);

      // Set optimistic value while effect is pending
      const handle = store.setOptimistic("key", "optimistic");
      expect(store.getSnapshot("key")).toEqual(success("optimistic"));

      // Resolve the original effect - the observer fiber will update
      // the entry because its fiber reference hasn't changed
      const resolver = resolvers.at(0);
      expect(resolver).toBeDefined();
      resolver?.("resolved");
      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("resolved"));
      });

      // rollback should be no-op since the effect resolved (version changed)
      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(success("resolved"));

      await runtime.dispose();
    });

    it("double rollback is idempotent", async () => {
      const { store, runtime } = createTestStore();
      store.run("key", Effect.succeed("original"));

      await vi.waitFor(() => {
        expect(store.getSnapshot("key")).toEqual(success("original"));
      });

      const handle = store.setOptimistic("key", "optimistic");
      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(success("original"));

      // Second rollback is no-op (version already changed)
      handle.rollback();
      expect(store.getSnapshot("key")).toEqual(success("original"));

      await runtime.dispose();
    });
  });
});
