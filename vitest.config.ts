import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: [
      "packages/*/tests/**/*.test.ts",
      "packages/*/tests/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
      exclude: ["packages/*/src/**/index.ts", "**/*.d.ts"],
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
