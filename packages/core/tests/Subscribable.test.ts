import { describe, it, expect, vi } from "vitest";
import { createSubscribable } from "../src/Subscribable.js";

describe("Subscribable", () => {
  describe("getSnapshot", () => {
    it("returns the initial value", () => {
      const sub = createSubscribable(42);
      expect(sub.getSnapshot()).toBe(42);
    });

    it("returns the updated value after set", () => {
      const sub = createSubscribable(0);
      sub.set(10);
      expect(sub.getSnapshot()).toBe(10);
    });
  });

  describe("subscribe / unsubscribe", () => {
    it("calls the callback when the value changes", () => {
      const sub = createSubscribable(0);
      const callback = vi.fn();
      sub.subscribe(callback);

      sub.set(1);
      expect(callback).toHaveBeenCalledOnce();
    });

    it("does not call the callback after unsubscribe", () => {
      const sub = createSubscribable(0);
      const callback = vi.fn();
      const unsubscribe = sub.subscribe(callback);

      unsubscribe();
      sub.set(1);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns an unsubscribe function", () => {
      const sub = createSubscribable(0);
      const unsubscribe = sub.subscribe(() => {});
      expect(typeof unsubscribe).toBe("function");
    });
  });

  describe("reference equality", () => {
    it("returns the same reference when set is called with the same value (Object.is)", () => {
      const obj = { a: 1 };
      const sub = createSubscribable(obj);

      const before = sub.getSnapshot();
      sub.set(obj);
      const after = sub.getSnapshot();

      expect(before).toBe(after);
    });

    it("does not notify subscribers when set with the same value", () => {
      const sub = createSubscribable(42);
      const callback = vi.fn();
      sub.subscribe(callback);

      sub.set(42);
      expect(callback).not.toHaveBeenCalled();
    });

    it("uses Object.is semantics (NaN === NaN)", () => {
      const sub = createSubscribable(NaN);
      const callback = vi.fn();
      sub.subscribe(callback);

      sub.set(NaN);
      expect(callback).not.toHaveBeenCalled();
      expect(sub.getSnapshot()).toBeNaN();
    });

    it("distinguishes +0 and -0", () => {
      const sub = createSubscribable(0);
      const callback = vi.fn();
      sub.subscribe(callback);

      sub.set(-0);
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe("multiple subscribers", () => {
    it("notifies all subscribers independently", () => {
      const sub = createSubscribable(0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      sub.subscribe(callback1);
      sub.subscribe(callback2);

      sub.set(1);
      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
    });

    it("unsubscribing one does not affect the other", () => {
      const sub = createSubscribable(0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const unsub1 = sub.subscribe(callback1);
      sub.subscribe(callback2);

      unsub1();
      sub.set(1);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledOnce();
    });
  });

  describe("multiple set calls", () => {
    it("notifies on each distinct change", () => {
      const sub = createSubscribable(0);
      const callback = vi.fn();
      sub.subscribe(callback);

      sub.set(1);
      sub.set(2);
      sub.set(3);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("does not notify when setting the same value repeatedly", () => {
      const sub = createSubscribable("hello");
      const callback = vi.fn();
      sub.subscribe(callback);

      sub.set("hello");
      sub.set("hello");
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("double unsubscribe", () => {
    it("is safe to call unsubscribe multiple times", () => {
      const sub = createSubscribable(0);
      const callback = vi.fn();
      const unsub = sub.subscribe(callback);

      unsub();
      unsub(); // should not throw

      sub.set(1);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
