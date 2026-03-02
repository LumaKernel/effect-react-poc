/**
 * Demo 2: Effect.all with mode: "either"
 *
 * Fetches 5 APIs in parallel. Some may fail, but all results are collected.
 * Demonstrates Effect.all { mode: "either" } — the Effect.allSettled equivalent.
 */
import { useCallback, useState } from "react";
import { Effect, Either } from "effect";
import { type ApiError, fetchEndpointMayFail } from "./api.js";

interface ResultItem {
  readonly name: string;
  readonly success: boolean;
  readonly value: string;
}

export const AllSettled = (): React.ReactNode => {
  const [results, setResults] = useState<readonly ResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(() => {
    setLoading(true);
    setResults([]);

    const endpoints = [
      { name: "Auth API", delay: 500, fail: false },
      { name: "Profile API", delay: 800, fail: true },
      { name: "Settings API", delay: 300, fail: false },
      { name: "Analytics API", delay: 1000, fail: true },
      { name: "Notifications API", delay: 600, fail: false },
    ] as const;

    const program = Effect.all(
      endpoints.map((ep) => fetchEndpointMayFail(ep.name, ep.delay, ep.fail)),
      { concurrency: "unbounded", mode: "either" },
    );

    void Effect.runPromise(program).then((eithers) => {
      const items: readonly ResultItem[] = eithers.map((either, i) => {
        const ep = endpoints[i];
        if (ep === undefined) {
          return {
            name: "Unknown",
            success: false,
            value: "Index out of bounds",
          };
        }
        if (Either.isRight(either)) {
          return { name: ep.name, success: true, value: either.right };
        }
        const err: ApiError = either.left;
        return { name: ep.name, success: false, value: err.message };
      });
      setResults(items);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h3>All Settled (mode: &quot;either&quot;)</h3>
      <p>
        Fetches 5 APIs concurrently. Some fail, but all results are collected
        using <code>{'Effect.all([...], { mode: "either" })'}</code>. Unlike
        default mode, failures don&apos;t short-circuit the other requests.
      </p>
      <button onClick={run} disabled={loading}>
        {loading ? "Fetching..." : "Fetch All (Some Will Fail)"}
      </button>
      {results.length > 0 && (
        <ul>
          {results.map((r) => (
            <li key={r.name} style={{ color: r.success ? "green" : "red" }}>
              {r.success ? "\u2705" : "\u274C"} {r.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
