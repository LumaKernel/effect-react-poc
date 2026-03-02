import { Effect } from "effect";
import { useEffectSuspense } from "@effect-react/react";

/**
 * Demonstrates useEffectSuspense with an async Effect.
 * While pending, the component suspends and shows the parent Suspense fallback.
 * When resolved, the value is returned directly.
 */
export const SuspenseExample = (): React.ReactNode => {
  const value = useEffectSuspense(
    "hello-suspense",
    Effect.delay(Effect.succeed("Hello from Suspense!"), "1 second"),
  );

  return <p>{value}</p>;
};
