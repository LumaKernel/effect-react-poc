import { describe, it, expect } from "vitest";
import * as core from "../src/index.js";

describe("@effect-react/core", () => {
  it("should export EffectResult constructors and helpers", () => {
    expect(core.initial).toBeDefined();
    expect(core.pending).toBeDefined();
    expect(core.success).toBeTypeOf("function");
    expect(core.failure).toBeTypeOf("function");
    expect(core.refreshing).toBeTypeOf("function");
    expect(core.matchEffectResult).toBeTypeOf("function");
    expect(core.hasValue).toBeTypeOf("function");
    expect(core.getValue).toBeTypeOf("function");
  });
});
