import { Data, Effect } from "effect";

// --- Types ---

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export class ApiError extends Data.TaggedError("ApiError")<{
  readonly message: string;
}> {}

// --- Simulated server state ---

let serverTodos: ReadonlyArray<Todo> = [
  { id: "1", title: "Buy groceries", completed: false },
  { id: "2", title: "Write documentation", completed: true },
  { id: "3", title: "Review pull request", completed: false },
  { id: "4", title: "Deploy to production", completed: false },
  { id: "5", title: "Fix flaky test", completed: true },
];

// --- Failure simulation ---

let failureMode: "none" | "always" | "random" = "none";

export const setFailureMode = (mode: "none" | "always" | "random"): void => {
  failureMode = mode;
};

export const getFailureMode = (): "none" | "always" | "random" => failureMode;

const shouldFail = (): boolean => {
  switch (failureMode) {
    case "none":
      return false;
    case "always":
      return true;
    case "random":
      return Math.random() < 0.5;
  }
};

// --- API functions ---

/**
 * Fetch all todos from the "server".
 * Simulates network delay.
 */
export const fetchTodos: Effect.Effect<
  ReadonlyArray<Todo>,
  ApiError
> = Effect.gen(function* () {
  yield* Effect.sleep("300 millis");
  return serverTodos;
});

/**
 * Toggle a todo's completed status on the "server".
 * Simulates network delay and possible failure.
 */
export const toggleTodo = (
  id: string,
): Effect.Effect<ReadonlyArray<Todo>, ApiError> =>
  Effect.gen(function* () {
    yield* Effect.sleep("800 millis");
    if (shouldFail()) {
      return yield* Effect.fail(
        new ApiError({
          message: `Server error: failed to toggle todo ${id satisfies string}`,
        }),
      );
    }
    serverTodos = serverTodos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    );
    return serverTodos;
  });

/**
 * Reset server state to initial values.
 */
export const resetServerState = (): void => {
  serverTodos = [
    { id: "1", title: "Buy groceries", completed: false },
    { id: "2", title: "Write documentation", completed: true },
    { id: "3", title: "Review pull request", completed: false },
    { id: "4", title: "Deploy to production", completed: false },
    { id: "5", title: "Fix flaky test", completed: true },
  ];
};
