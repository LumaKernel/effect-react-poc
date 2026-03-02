/**
 * Demo 4: Effect.makeSemaphore
 *
 * Runs 10 tasks with a concurrency limit of 3 using a semaphore.
 * Shows real-time progress of which tasks are running/completed.
 * Demonstrates Effect.makeSemaphore + Semaphore.withPermits.
 */
import { useCallback, useState } from "react";
import { Effect } from "effect";

interface TaskState {
  readonly id: number;
  readonly status: "pending" | "running" | "done";
}

const TASK_COUNT = 10;
const MAX_CONCURRENCY = 3;
const TASK_DELAY_BASE = 400;
const TASK_DELAY_VARIANCE = 800;

export const SemaphoreDemo = (): React.ReactNode => {
  const [tasks, setTasks] = useState<readonly TaskState[]>([]);
  const [loading, setLoading] = useState(false);

  const updateTask = useCallback(
    (id: number, status: "pending" | "running" | "done") => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    },
    [],
  );

  const run = useCallback(() => {
    setLoading(true);
    const initial: readonly TaskState[] = Array.from(
      { length: TASK_COUNT },
      (_, i) => ({
        id: i + 1,
        status: "pending" as const,
      }),
    );
    setTasks(initial);

    const program = Effect.gen(function* () {
      const semaphore = yield* Effect.makeSemaphore(MAX_CONCURRENCY);

      const taskEffects = Array.from({ length: TASK_COUNT }, (_, i) => {
        const taskId = i + 1;
        const delay =
          TASK_DELAY_BASE + Math.round(Math.random() * TASK_DELAY_VARIANCE);

        return semaphore.withPermits(1)(
          Effect.gen(function* () {
            updateTask(taskId, "running");
            yield* Effect.sleep(delay);
            updateTask(taskId, "done");
            return `Task ${String(taskId) satisfies string} done`;
          }),
        );
      });

      return yield* Effect.all(taskEffects, { concurrency: "unbounded" });
    });

    void Effect.runPromise(program).then(() => {
      setLoading(false);
    });
  }, [updateTask]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const runningCount = tasks.filter((t) => t.status === "running").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <h3>Semaphore (concurrency limit)</h3>
      <p>
        Runs {String(TASK_COUNT)} tasks but limits concurrency to{" "}
        {String(MAX_CONCURRENCY)} using{" "}
        <code>Effect.makeSemaphore({String(MAX_CONCURRENCY)})</code>. Tasks
        queue up and only {String(MAX_CONCURRENCY)} run at a time.
      </p>
      <button onClick={run} disabled={loading}>
        {loading
          ? "Running..."
          : `Run ${String(TASK_COUNT) satisfies string} Tasks (max ${String(MAX_CONCURRENCY) satisfies string} concurrent)`}
      </button>
      {tasks.length > 0 && (
        <div>
          <p>
            Pending: {String(pendingCount)} | Running: {String(runningCount)} |
            Done: {String(doneCount)}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {tasks.map((t) => (
              <div
                key={t.id}
                style={{
                  width: "80px",
                  padding: "8px",
                  textAlign: "center",
                  borderRadius: "4px",
                  backgroundColor:
                    t.status === "done"
                      ? "#c8e6c9"
                      : t.status === "running"
                        ? "#fff9c4"
                        : "#e0e0e0",
                  border: "1px solid #999",
                }}
              >
                <div>Task {String(t.id)}</div>
                <div style={{ fontSize: "12px" }}>
                  {t.status === "done"
                    ? "\u2705"
                    : t.status === "running"
                      ? "\u23f3"
                      : "\u23f8\ufe0f"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
