import { Context, Data, Effect, Layer, Schema, SubscriptionRef } from "effect";
import type { Stream } from "effect";
import { Todo, TodoList } from "./TodoSchema.js";

// --- Error types ---

export class TodoNotFound extends Data.TaggedError("TodoNotFound")<{
  readonly id: string;
}> {}

// --- Storage service (abstraction for persistence) ---

export interface StorageService {
  readonly getItem: (key: string) => Effect.Effect<string | null>;
  readonly setItem: (key: string, value: string) => Effect.Effect<void>;
}

export class Storage extends Context.Tag("Storage")<
  Storage,
  StorageService
>() {}

// --- Todo service ---

export interface TodoService {
  readonly getAll: Effect.Effect<ReadonlyArray<Todo>>;
  readonly add: (title: string) => Effect.Effect<Todo>;
  readonly toggle: (id: string) => Effect.Effect<Todo, TodoNotFound>;
  readonly remove: (id: string) => Effect.Effect<void, TodoNotFound>;
  readonly changes: Stream.Stream<ReadonlyArray<Todo>>;
}

export class Todos extends Context.Tag("Todos")<Todos, TodoService>() {}

// --- Storage key ---

const STORAGE_KEY = "effect-react-todos";

// --- Simple ID generator ---

// eslint-disable-next-line luma-ts/no-date -- Temporal API not available in all environments
const getNow = (): number => Date.now();

let nextId = 0;
const generateId = (): string => {
  nextId += 1;
  return `todo-${String(nextId) satisfies string}-${String(getNow()) satisfies string}`;
};

// --- TodoService implementation backed by Storage + SubscriptionRef ---

export const TodosLive: Layer.Layer<Todos, never, Storage> = Layer.effect(
  Todos,
  Effect.gen(function* () {
    const storage = yield* Storage;

    // Load initial todos from storage
    const raw = yield* storage.getItem(STORAGE_KEY);
    const initialTodos: ReadonlyArray<Todo> =
      raw !== null
        ? Schema.decodeUnknownSync(TodoList)(JSON.parse(raw) as unknown)
        : [];

    const ref = yield* SubscriptionRef.make(initialTodos);

    // Persist helper
    const persist = (todos: ReadonlyArray<Todo>): Effect.Effect<void> =>
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify(Schema.encodeSync(TodoList)(todos)),
      );

    return {
      getAll: SubscriptionRef.get(ref),

      add: (title: string) =>
        Effect.gen(function* () {
          const todo = new Todo({ id: generateId(), title, completed: false });
          yield* SubscriptionRef.update(ref, (todos) => [...todos, todo]);
          const current = yield* SubscriptionRef.get(ref);
          yield* persist(current);
          return todo;
        }),

      toggle: (id: string) =>
        Effect.gen(function* () {
          let found: Todo | undefined;
          yield* SubscriptionRef.update(ref, (todos) => {
            const updated = todos.map((todo) =>
              todo.id === id
                ? new Todo({
                    id: todo.id,
                    title: todo.title,
                    completed: !todo.completed,
                  })
                : todo,
            );
            found = updated.find((t) => t.id === id);
            return updated;
          });
          if (found === undefined) {
            return yield* Effect.fail(new TodoNotFound({ id }));
          }
          const current = yield* SubscriptionRef.get(ref);
          yield* persist(current);
          return found;
        }),

      remove: (id: string) =>
        Effect.gen(function* () {
          const before = yield* SubscriptionRef.get(ref);
          const exists = before.some((t) => t.id === id);
          if (!exists) {
            return yield* Effect.fail(new TodoNotFound({ id }));
          }
          yield* SubscriptionRef.update(ref, (todos) =>
            todos.filter((t) => t.id !== id),
          );
          const current = yield* SubscriptionRef.get(ref);
          yield* persist(current);
        }),

      changes: ref.changes,
    };
  }),
);

// --- localStorage-based Storage Layer ---

export const BrowserStorageLive: Layer.Layer<Storage> = Layer.succeed(Storage, {
  getItem: (key: string) => Effect.sync(() => localStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    Effect.sync(() => {
      localStorage.setItem(key, value);
    }),
});

// --- In-memory Storage Layer (for testing) ---

export const createInMemoryStorage = (): {
  readonly layer: Layer.Layer<Storage>;
  readonly store: Map<string, string>;
} => {
  const store = new Map<string, string>();
  const layer = Layer.succeed(Storage, {
    getItem: (key: string) => Effect.sync(() => store.get(key) ?? null),
    setItem: (key: string, value: string) =>
      Effect.sync(() => {
        store.set(key, value);
      }),
  });
  return { layer, store };
};
