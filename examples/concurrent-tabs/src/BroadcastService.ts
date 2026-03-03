import { Context, Effect, Layer, Stream, SubscriptionRef, Ref } from "effect";

// --- Message types ---

export type TabMessage =
  | { readonly type: "counter-update"; readonly value: number }
  | { readonly type: "leader-claim"; readonly tabId: string }
  | { readonly type: "leader-ack"; readonly tabId: string }
  | { readonly type: "ping"; readonly tabId: string };

// --- Service interface ---

export interface BroadcastServiceShape {
  readonly tabId: string;
  readonly send: (message: TabMessage) => Effect.Effect<void>;
  readonly messages: Stream.Stream<TabMessage>;
  readonly counter: SubscriptionRef.SubscriptionRef<number>;
  readonly leader: SubscriptionRef.SubscriptionRef<string | null>;
}

export class BroadcastService extends Context.Tag("BroadcastService")<
  BroadcastService,
  BroadcastServiceShape
>() {}

/**
 * Creates a BroadcastService backed by the BroadcastChannel API.
 *
 * Demonstrates:
 * - `Stream.async` for wrapping BroadcastChannel's onmessage as a Stream
 * - `Effect.acquireRelease` for channel lifecycle management
 * - `SubscriptionRef` for shared counter state
 * - `Effect.race` for leader election
 */
export const BroadcastServiceLive: Layer.Layer<BroadcastService> = Layer.effect(
  BroadcastService,
  Effect.gen(function* () {
    const tabId = `tab-${String(Math.floor(Math.random() * 10000)) satisfies string}`;
    const channel = new BroadcastChannel("effect-react-tabs");

    const counterRef = yield* SubscriptionRef.make(0);
    const leaderRef = yield* SubscriptionRef.make<string | null>(null);
    const claimSent = yield* Ref.make(false);

    // Type guard for TabMessage from unknown BroadcastChannel data
    // Parse unknown data from BroadcastChannel into TabMessage
    const parseTabMessage = (data: unknown): TabMessage | null => {
      if (typeof data !== "object" || data === null || !("type" in data)) {
        return null;
      }
      // data is narrowed to `object & { type: unknown }`
      const { type } = data;
      if (typeof type !== "string") return null;

      switch (type) {
        case "counter-update": {
          if (!("value" in data)) return null;
          const { value } = data;
          if (typeof value !== "number") return null;
          return { type: "counter-update", value };
        }
        case "leader-claim":
        case "leader-ack":
        case "ping": {
          if (!("tabId" in data)) return null;
          const { tabId } = data;
          if (typeof tabId !== "string") return null;
          return { type, tabId };
        }
        default:
          return null;
      }
    };

    // Wrap BroadcastChannel.onmessage as a Stream
    const messages: Stream.Stream<TabMessage> = Stream.async<TabMessage>(
      (emit) => {
        channel.onmessage = (event: MessageEvent<unknown>) => {
          const parsed = parseTabMessage(event.data);
          if (parsed !== null) {
            void emit.single(parsed);
          }
        };
      },
    );

    const send = (message: TabMessage): Effect.Effect<void> =>
      Effect.sync(() => {
        channel.postMessage(message);
      });

    // Listen for incoming messages and update state
    yield* Effect.fork(
      Stream.runForEach(messages, (msg) =>
        Effect.gen(function* () {
          switch (msg.type) {
            case "counter-update":
              yield* SubscriptionRef.set(counterRef, msg.value);
              break;
            case "leader-claim": {
              // Another tab is claiming leadership
              const alreadyClaimed = yield* Ref.get(claimSent);
              if (!alreadyClaimed) {
                // Accept the other tab's claim
                yield* SubscriptionRef.set(leaderRef, msg.tabId);
              }
              break;
            }
            case "leader-ack":
              yield* SubscriptionRef.set(leaderRef, msg.tabId);
              break;
            case "ping":
              // Just a keep-alive, no action needed
              break;
          }
        }),
      ),
    );

    // Leader election: claim leadership, wait for contention
    yield* Effect.fork(
      Effect.gen(function* () {
        yield* Effect.sleep(500 + Math.floor(Math.random() * 500));
        yield* Ref.set(claimSent, true);
        yield* send({ type: "leader-claim", tabId });

        // Wait a bit to see if another tab contests
        yield* Effect.sleep(1000);

        const currentLeader = yield* Ref.get(leaderRef);
        if (currentLeader === null) {
          // No one else claimed, we are the leader
          yield* SubscriptionRef.set(leaderRef, tabId);
          yield* send({ type: "leader-ack", tabId });
        }
      }),
    );

    return {
      tabId,
      send,
      messages,
      counter: counterRef,
      leader: leaderRef,
    };
  }),
);
