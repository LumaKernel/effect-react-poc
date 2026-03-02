/**
 * Demo 1: Effect.all with concurrency: "unbounded"
 *
 * Fetches 3 APIs in parallel. All must succeed for the result to appear.
 * Demonstrates structured concurrency with Effect.all.
 */
import { useCallback, useState } from "react";
import { Effect } from "effect";
import { fetchEndpoint } from "./api.js";

export const ParallelFetch = (): React.ReactNode => {
  const [results, setResults] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const run = useCallback(() => {
    setLoading(true);
    setResults([]);
    setElapsed(null);

    const start = performance.now();

    const program = Effect.all(
      [
        fetchEndpoint("Users API", 800),
        fetchEndpoint("Products API", 1200),
        fetchEndpoint("Orders API", 600),
      ],
      { concurrency: "unbounded" },
    );

    void Effect.runPromise(program).then((res) => {
      setElapsed(Math.round(performance.now() - start));
      setResults(res);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h3>Parallel Fetch (Effect.all)</h3>
      <p>
        Fetches 3 APIs concurrently using{" "}
        <code>{'Effect.all([...], { concurrency: "unbounded" })'}</code>. All
        requests run simultaneously — total time ≈ slowest request (1200ms), not
        sum (2600ms).
      </p>
      <button onClick={run} disabled={loading}>
        {loading ? "Fetching..." : "Fetch All"}
      </button>
      {results.length > 0 && (
        <div>
          <ul>
            {results.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {elapsed !== null && (
            <p>
              <strong>
                Total time: {String(elapsed)}ms (parallel, not sequential)
              </strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
