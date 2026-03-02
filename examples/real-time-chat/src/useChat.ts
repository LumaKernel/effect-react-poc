import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Effect, Fiber, Stream } from "effect";
import { createSubscribable } from "@effect-react/core";
import { useEffectRuntime } from "@effect-react/react";
import type { ChatMessage, ConnectionState } from "./message.js";
import { WebSocketService } from "./WebSocketService.js";

/**
 * Custom hook that subscribes to incoming chat messages and accumulates them.
 *
 * Demonstrates:
 * - `useEffectRuntime` for typed runtime access
 * - `Stream.runForEach` for consuming message stream
 * - `Stream.mapAccum` for accumulating messages into a list
 * - `createSubscribable` + `useSyncExternalStore` for reactive state
 */
export const useChatMessages = (): readonly ChatMessage[] => {
  const runtime = useEffectRuntime<WebSocketService, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<readonly ChatMessage[]>([]);
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const ws = yield* WebSocketService;
      // Accumulate messages into a growing list using Stream.scan
      const initialMessages: readonly ChatMessage[] = [];
      const accumulatedStream = ws.messages.pipe(
        Stream.scan(initialMessages, (acc, msg) => [...acc, msg]),
      );
      yield* Stream.runForEach(accumulatedStream, (messages) =>
        Effect.sync(() => {
          internals.subscribable.set(messages);
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
 * Custom hook that provides a send function for chat messages.
 *
 * Demonstrates:
 * - `runtime.runFork` for fire-and-forget Effect execution
 * - Accessing WebSocketService through the Counter Layer
 */
export const useSendMessage = (): ((text: string) => void) => {
  const runtime = useEffectRuntime<WebSocketService, never>();

  return useCallback(
    (text: string) => {
      runtime.runFork(
        Effect.gen(function* () {
          const ws = yield* WebSocketService;
          yield* ws.send(text);
        }),
      );
    },
    [runtime],
  );
};

/**
 * Custom hook that subscribes to WebSocket connection state changes.
 *
 * Demonstrates:
 * - `SubscriptionRef.changes` stream for reactive state observation
 * - Connection state lifecycle (connected → disconnected → reconnecting)
 */
export const useConnectionState = (): ConnectionState => {
  const runtime = useEffectRuntime<WebSocketService, never>();

  const internals = useMemo(() => {
    const subscribable = createSubscribable<ConnectionState>("disconnected");
    return {
      subscribable,
      fiber: null as Fiber.RuntimeFiber<unknown, unknown> | null,
    };
  }, [runtime]);

  useEffect(() => {
    const consumeEffect = Effect.gen(function* () {
      const ws = yield* WebSocketService;
      yield* Stream.runForEach(ws.connectionState, (state) =>
        Effect.sync(() => {
          internals.subscribable.set(state);
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
