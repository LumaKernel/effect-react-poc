import { describe, it, expect } from "vitest";
import { Cause, Equal } from "effect";
import {
  initial,
  pending,
  success,
  failure,
  refreshing,
  isInitial,
  isPending,
  isSuccess,
  isFailure,
  isRefreshing,
  matchEffectResult,
  hasValue,
  getValue,
} from "../src/EffectResult.js";
import type { EffectResult } from "../src/EffectResult.js";

describe("EffectResult", () => {
  describe("constructors", () => {
    it("creates Initial state", () => {
      expect(initial._tag).toBe("Initial");
    });

    it("creates Pending state", () => {
      expect(pending._tag).toBe("Pending");
    });

    it("creates Success state with value", () => {
      const result = success(42);
      expect(result._tag).toBe("Success");
      expect(result.value).toBe(42);
    });

    it("creates Failure state with cause", () => {
      const cause = Cause.fail("error");
      const result = failure(cause);
      expect(result._tag).toBe("Failure");
      expect(result.cause).toBe(cause);
    });

    it("creates Refreshing state with value", () => {
      const result = refreshing("data");
      expect(result._tag).toBe("Refreshing");
      expect(result.value).toBe("data");
    });
  });

  describe("structural equality (Data.struct)", () => {
    it("Initial instances are structurally equal", () => {
      expect(Equal.equals(initial, initial)).toBe(true);
    });

    it("Success instances with same value are structurally equal", () => {
      const a = success(42);
      const b = success(42);
      expect(Equal.equals(a, b)).toBe(true);
    });

    it("Success instances with different values are not equal", () => {
      const a = success(42);
      const b = success(99);
      expect(Equal.equals(a, b)).toBe(false);
    });

    it("Failure instances with same cause are structurally equal", () => {
      const cause = Cause.fail("error");
      const a = failure(cause);
      const b = failure(cause);
      expect(Equal.equals(a, b)).toBe(true);
    });

    it("Refreshing instances with same value are structurally equal", () => {
      const a = refreshing("data");
      const b = refreshing("data");
      expect(Equal.equals(a, b)).toBe(true);
    });

    it("different tags are not equal", () => {
      const a = initial;
      const b = pending;
      expect(Equal.equals(a, b)).toBe(false);
    });
  });

  describe("type guards", () => {
    it("isInitial correctly identifies Initial", () => {
      const result: EffectResult<number, string> = initial;
      expect(isInitial(result)).toBe(true);
      expect(isPending(result)).toBe(false);
      expect(isSuccess(result)).toBe(false);
      expect(isFailure(result)).toBe(false);
      expect(isRefreshing(result)).toBe(false);
    });

    it("isPending correctly identifies Pending", () => {
      const result: EffectResult<number, string> = pending;
      expect(isPending(result)).toBe(true);
      expect(isInitial(result)).toBe(false);
    });

    it("isSuccess correctly identifies Success", () => {
      const result: EffectResult<number, string> = success(42);
      expect(isSuccess(result)).toBe(true);
      expect(isInitial(result)).toBe(false);
    });

    it("isFailure correctly identifies Failure", () => {
      const result: EffectResult<number, string> = failure(Cause.fail("error"));
      expect(isFailure(result)).toBe(true);
      expect(isInitial(result)).toBe(false);
    });

    it("isRefreshing correctly identifies Refreshing", () => {
      const result: EffectResult<number, string> = refreshing(42);
      expect(isRefreshing(result)).toBe(true);
      expect(isInitial(result)).toBe(false);
    });
  });

  describe("matchEffectResult (exhaustive)", () => {
    const formatResult = (result: EffectResult<number, string>): string =>
      matchEffectResult(result, {
        Initial: () => "initial",
        Pending: () => "pending",
        Success: ({ value }) => `success:${String(value) satisfies string}`,
        Failure: ({ cause }) =>
          `failure:${(Cause.isFailType(cause) ? cause.error : "unknown") satisfies string}`,
        Refreshing: ({ value }) =>
          `refreshing:${String(value) satisfies string}`,
      });

    it("matches Initial", () => {
      expect(formatResult(initial)).toBe("initial");
    });

    it("matches Pending", () => {
      expect(formatResult(pending)).toBe("pending");
    });

    it("matches Success", () => {
      expect(formatResult(success(42))).toBe("success:42");
    });

    it("matches Failure", () => {
      expect(formatResult(failure(Cause.fail("oops")))).toBe("failure:oops");
    });

    it("matches Refreshing", () => {
      expect(formatResult(refreshing(99))).toBe("refreshing:99");
    });
  });

  describe("hasValue", () => {
    it("returns true for Success", () => {
      expect(hasValue(success(42))).toBe(true);
    });

    it("returns true for Refreshing", () => {
      expect(hasValue(refreshing(42))).toBe(true);
    });

    it("returns false for Initial", () => {
      expect(hasValue(initial)).toBe(false);
    });

    it("returns false for Pending", () => {
      expect(hasValue(pending)).toBe(false);
    });

    it("returns false for Failure", () => {
      expect(hasValue(failure(Cause.fail("error")))).toBe(false);
    });
  });

  describe("getValue", () => {
    it("returns value for Success", () => {
      expect(getValue(success(42))).toBe(42);
    });

    it("returns value for Refreshing", () => {
      expect(getValue(refreshing("data"))).toBe("data");
    });

    it("returns undefined for Initial", () => {
      expect(getValue(initial)).toBeUndefined();
    });

    it("returns undefined for Pending", () => {
      expect(getValue(pending)).toBeUndefined();
    });

    it("returns undefined for Failure", () => {
      expect(getValue(failure(Cause.fail("error")))).toBeUndefined();
    });
  });
});
