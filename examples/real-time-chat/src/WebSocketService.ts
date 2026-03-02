import {
  Context,
  Effect,
  Layer,
  PubSub,
  Ref,
  Schedule,
  Stream,
  SubscriptionRef,
} from "effect";
import type { ChatMessage, ConnectionState } from "./message.js";
import { WebSocketError } from "./message.js";

// eslint-disable-next-line luma-ts/no-date -- Temporal API not available in all environments
const getNow = (): number => Date.now();

/**
 * WebSocketService interface:
 * - `messages`: Stream of incoming chat messages (echoed from "server")
 * - `send`: Send a message through WebSocket
 * - `connectionState`: Stream of connection state changes
 * - `getConnectionState`: Get current connection state
 */
export interface WebSocketServiceShape {
  readonly messages: Stream.Stream<ChatMessage>;
  readonly send: (text: string) => Effect.Effect<void, WebSocketError>;
  readonly connectionState: Stream.Stream<ConnectionState>;
  readonly getConnectionState: Effect.Effect<ConnectionState>;
}

export class WebSocketService extends Context.Tag("WebSocketService")<
  WebSocketService,
  WebSocketServiceShape
>() {}

/**
 * Creates a simulated WebSocket connection using PubSub.
 *
 * Demonstrates:
 * - `PubSub.bounded` for message distribution
 * - `Stream.fromQueue` for converting PubSub subscription to Stream
 * - `SubscriptionRef` for connection state tracking
 * - `Schedule.exponential` for reconnection retry
 * - `Effect.acquireRelease` for WebSocket lifecycle management
 *
 * The simulation:
 * - "Connects" immediately (simulates WebSocket open)
 * - Echoes sent messages back after a small delay (simulates server response)
 * - Periodically "disconnects" and reconnects (simulates network instability)
 */
export const WebSocketServiceLive: Layer.Layer<WebSocketService> = Layer.effect(
  WebSocketService,
  Effect.gen(function* () {
    // PubSub for distributing incoming messages to subscribers
    const messagePubSub = yield* PubSub.bounded<ChatMessage>(64);

    // Connection state tracked via SubscriptionRef
    const connectionStateRef =
      yield* SubscriptionRef.make<ConnectionState>("disconnected");

    // Counter for generating unique message IDs
    const idCounter = yield* Ref.make(0);

    const generateId = Effect.gen(function* () {
      const count = yield* Ref.getAndUpdate(idCounter, (n) => n + 1);
      return `msg-${String(count) satisfies string}`;
    });

    // Simulate sending: echo message back after a delay
    const send = (text: string): Effect.Effect<void, WebSocketError> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(connectionStateRef);
        if (state !== "connected") {
          yield* Effect.fail(new WebSocketError({ message: "Not connected" }));
        }

        // Publish the sent message immediately (local echo)
        const sentId = yield* generateId;
        const sentMessage: ChatMessage = {
          id: sentId,
          sender: "me",
          text,
          timestamp: getNow(),
        };
        yield* PubSub.publish(messagePubSub, sentMessage);

        // Schedule an echo response after a delay
        yield* Effect.fork(
          Effect.gen(function* () {
            yield* Effect.sleep("300 millis");
            const echoId = yield* generateId;
            const echoMessage: ChatMessage = {
              id: echoId,
              sender: "echo",
              text: `Echo: ${text satisfies string}`,
              timestamp: getNow(),
            };
            yield* PubSub.publish(messagePubSub, echoMessage);
          }),
        );
      });

    // Create message stream from PubSub subscription
    const messages: Stream.Stream<ChatMessage> = Stream.unwrapScoped(
      Effect.gen(function* () {
        const queue = yield* PubSub.subscribe(messagePubSub);
        return Stream.fromQueue(queue);
      }),
    );

    // Connection lifecycle with auto-reconnect
    // Simulates periodic disconnection every ~10 seconds, then reconnects with exponential backoff
    const connectEffect = Effect.gen(function* () {
      yield* SubscriptionRef.set(connectionStateRef, "connected");

      // Simulate stable connection for a random period (8-12 seconds)
      const durationMs = 8000 + Math.floor(Math.random() * 4000);
      yield* Effect.sleep(durationMs);

      // Simulate disconnect
      yield* SubscriptionRef.set(connectionStateRef, "disconnected");
      yield* Effect.fail(
        new WebSocketError({ message: "Connection lost (simulated)" }),
      );
    });

    // Auto-reconnect loop using Stream.retry with exponential backoff
    const connectionStream = Stream.fromEffect(connectEffect).pipe(
      Stream.retry(
        Schedule.exponential("1 second").pipe(
          Schedule.compose(Schedule.recurs(5)),
        ),
      ),
      Stream.tapError(() =>
        SubscriptionRef.set(connectionStateRef, "reconnecting"),
      ),
    );

    // Fork the connection lifecycle (runs in background)
    yield* Effect.fork(
      Stream.runDrain(connectionStream).pipe(
        Effect.catchAll(() =>
          SubscriptionRef.set(connectionStateRef, "disconnected"),
        ),
      ),
    );

    return {
      messages,
      send,
      connectionState: connectionStateRef.changes,
      getConnectionState: Ref.get(connectionStateRef),
    };
  }),
);
