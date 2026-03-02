import { Context, Effect, Layer, Ref, SubscriptionRef } from "effect";
import type { Stream } from "effect";

/**
 * CounterService interface:
 * - `get`: read current count
 * - `increment`/`decrement`: modify count
 * - `changes`: stream of count values (including current value on subscription)
 */
export interface CounterService {
  readonly get: Effect.Effect<number>;
  readonly increment: Effect.Effect<void>;
  readonly decrement: Effect.Effect<void>;
  readonly changes: Stream.Stream<number>;
}

export class Counter extends Context.Tag("Counter")<
  Counter,
  CounterService
>() {}

/**
 * Live Layer that creates a SubscriptionRef<number> initialized to 0.
 * The SubscriptionRef is shared across all consumers within the same Provider scope.
 */
export const CounterLive: Layer.Layer<Counter> = Layer.effect(
  Counter,
  Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(0);
    return {
      get: Ref.get(ref),
      increment: Ref.update(ref, (n) => n + 1),
      decrement: Ref.update(ref, (n) => n - 1),
      changes: ref.changes,
    };
  }),
);
