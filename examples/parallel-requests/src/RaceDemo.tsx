/**
 * Demo 3: Effect.raceAll
 *
 * Sends the same request to 3 mirror servers simultaneously.
 * Returns the fastest response and interrupts the rest.
 * Demonstrates Effect.raceAll for latency optimization.
 */
import { useCallback, useState } from "react";
import { Effect } from "effect";
import { fetchMirror } from "./api.js";

export const RaceDemo = (): React.ReactNode => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [interrupted, setInterrupted] = useState<readonly string[]>([]);

  const run = useCallback(() => {
    setLoading(true);
    setResult(null);
    setInterrupted([]);

    const interruptedMirrors: string[] = [];

    const makeMirrorEffect = (
      mirrorId: number,
      delayMs: number,
    ): Effect.Effect<string> =>
      fetchMirror(mirrorId, delayMs).pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interruptedMirrors.push(
              `Mirror ${String(mirrorId) satisfies string}`,
            );
          }),
        ),
      );

    const program = Effect.raceAll([
      makeMirrorEffect(1, 1500),
      makeMirrorEffect(2, 800),
      makeMirrorEffect(3, 1200),
    ]);

    void Effect.runPromise(program).then((winner) => {
      setResult(winner);
      setInterrupted(interruptedMirrors);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h3>Race (Effect.raceAll)</h3>
      <p>
        Sends a request to 3 mirror servers simultaneously using{" "}
        <code>Effect.raceAll</code>. The fastest response wins, and the slower
        ones are automatically interrupted (canceled).
      </p>
      <button onClick={run} disabled={loading}>
        {loading ? "Racing..." : "Race 3 Mirrors"}
      </button>
      {result !== null && (
        <div>
          <p style={{ color: "green" }}>
            <strong>Winner:</strong> {result}
          </p>
          {interrupted.length > 0 && (
            <p style={{ color: "gray" }}>
              Interrupted: {interrupted.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
