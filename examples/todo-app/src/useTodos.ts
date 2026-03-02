import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Effect, Fiber, Stream } from "effect";
import { createSubscribable } from "@effect-react/core";
import { useEffectRuntime } from "@effect-react/react";
import type { Todo } from "./TodoSchema.js";
import { Todos } from "./TodoService.js";

/**
 * Subscribe to the todo list changes via SubscriptionRef.
 *
 * Uses the same pattern as useCounterValue:
 * - useEffectRuntime<Todos, never>() for typed runtime access
 * - createSubscribable + useSyncExternalStore for reactive state
 * - Stream.runForEach to consume SubscriptionRef.changes
 */
export const useTodoList = (): ReadonlyArray<Todo> => {
  const runtime = useEffectRuntime<Todos, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<ReadonlyArray<Todo>>([]);
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const todos = yield* Todos;
      yield* Stream.runForEach(todos.changes, (value) =>
        Effect.sync(() => {
          internals.subscribable.set(value);
        }),
      );
    });

    const fiber = runtime.runFork(consumeEffect);
    internals.fiber = fiber;

    return () => {
      if (internals.fiber !== null) {
        runtime.runFork(Fiber.interruptFork(internals.fiber));
        internals.fiber = null;
      }
    };
  }, [runtime, internals]);

  return useSyncExternalStore(
    internals.subscribable.subscribe,
    internals.subscribable.getSnapshot,
  );
};

/**
 * Provides actions to mutate the todo list: add, toggle, remove.
 *
 * Uses runtime.runFork for fire-and-forget Effect execution.
 */
export const useTodoActions = (): {
  readonly add: (title: string) => void;
  readonly toggle: (id: string) => void;
  readonly remove: (id: string) => void;
} => {
  const runtime = useEffectRuntime<Todos, never>();

  const add = useCallback(
    (title: string) => {
      runtime.runFork(
        Effect.gen(function* () {
          const todos = yield* Todos;
          yield* todos.add(title);
        }),
      );
    },
    [runtime],
  );

  const toggle = useCallback(
    (id: string) => {
      runtime.runFork(
        Effect.gen(function* () {
          const todos = yield* Todos;
          yield* todos.toggle(id);
        }),
      );
    },
    [runtime],
  );

  const remove = useCallback(
    (id: string) => {
      runtime.runFork(
        Effect.gen(function* () {
          const todos = yield* Todos;
          yield* todos.remove(id);
        }),
      );
    },
    [runtime],
  );

  return { add, toggle, remove };
};
